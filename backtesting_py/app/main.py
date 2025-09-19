from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List

from backtesting import Backtest, Strategy
from backtesting.lib import crossover
from backtesting.test import GOOG
import numpy as np
import pandas as pd
import random
import math
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()


class DSL(BaseModel):
    name: str
    description: str | None = None
    symbols: List[str]
    timeframe: str
    indicators: List[Dict[str, Any]] = []
    entries: List[Dict[str, Any]] = []
    exits: List[Dict[str, Any]] = []
    risk: Dict[str, Any]


class RunRequest(BaseModel):
    dsl: DSL
    ohlcv: List[Dict[str, Any]] | None = None  # Optional custom data
    initial_capital: float = 10000.0


def _ema(series: pd.Series, length: int) -> np.ndarray:
    return series.ewm(span=max(1, int(length)), adjust=False).mean().to_numpy()


def _rsi(series: pd.Series, length: int) -> np.ndarray:
    delta = series.diff()
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    gain = up.ewm(alpha=1/length, adjust=False).mean()
    loss = down.ewm(alpha=1/length, adjust=False).mean()
    rs = gain / (loss + 1e-12)
    rsi = 100 - (100 / (1 + rs))
    return rsi.to_numpy()


def _build_strategy_from_params(params: Dict[str, Any]):
    ema_fast = int(params.get('ema_fast_length', 10))
    ema_slow = int(params.get('ema_slow_length', 20))
    rsi_len = int(params.get('rsi_length', 14))
    rsi_overbought = float(params.get('rsi_overbought', 70))
    rsi_oversold = float(params.get('rsi_oversold', 30))

    class S(Strategy):
        def init(self):
            self.ema_fast = self.I(_ema, self.data.Close.s, ema_fast)
            self.ema_slow = self.I(_ema, self.data.Close.s, ema_slow)
            self.rsi = self.I(_rsi, self.data.Close.s, rsi_len)

        def next(self):
            if crossover(self.ema_fast, self.ema_slow) and self.rsi[-1] < rsi_overbought:
                self.buy()
            elif crossover(self.ema_slow, self.ema_fast) and self.rsi[-1] > rsi_oversold:
                self.sell()
    return S


def _extract_trades(stats, bt) -> list[dict]:
    trades_df = getattr(stats, '_trades', None)
    if trades_df is None and hasattr(bt, '_results') and hasattr(bt._results, '_trades'):
        trades_df = bt._results._trades
    if trades_df is None:
        return []

    # Ensure DataFrame
    try:
        df = pd.DataFrame(trades_df)
    except Exception:
        return []

    def safe_float(v):
        try:
            return float(v) if pd.notna(v) else None
        except Exception:
            return None

    out = []
    for _, r in df.iterrows():
        item = {
            'entryTime': str(r.get('EntryTime') or r.get('Entry time') or r.get('Entry')),
            'exitTime': str(r.get('ExitTime') or r.get('Exit time') or r.get('Exit')),
            'entryPrice': safe_float(r.get('EntryPrice') or r.get('Entry price')),
            'exitPrice': safe_float(r.get('ExitPrice') or r.get('Exit price')),
            'size': safe_float(r.get('Size')),
            'pnl': safe_float(r.get('PnL') or r.get('PnL [$]') or r.get('PnL %')),
            'returnPct': safe_float(r.get('ReturnPct') or r.get('Return [%]')),
            'direction': r.get('Direction') or r.get('Trade') or None,
            'mae': safe_float(r.get('MAE')),
            'mfe': safe_float(r.get('MFE')),
            'bars': int(r.get('Bars')) if pd.notna(r.get('Bars')) else None,
        }
        out.append(item)
    return out


@app.post("/run")
def run_backtest(req: RunRequest):
    try:
        # Data
        if req.ohlcv:
            df = pd.DataFrame(req.ohlcv)
            df.index = pd.to_datetime(df['time'])
            df = df.rename(columns={'open':'Open','high':'High','low':'Low','close':'Close','volume':'Volume'})
            df = df[['Open','High','Low','Close','Volume']]
        else:
            df = GOOG

        StrategyClass = _build_strategy_from_params({})
        bt = Backtest(df, StrategyClass, cash=req.initial_capital, commission=.0002)
        stats = bt.run()

        equity_curve = [{'time': str(idx), 'equity': float(val)} for idx, val in bt._equity_curve['Equity'].items()]
        trades = _extract_trades(stats, bt)

        result = {
            'strategyName': req.dsl.name,
            'initialCapital': req.initial_capital,
            'finalCapital': float(stats.get('_equity_curve')[-1] if isinstance(stats.get('_equity_curve'), np.ndarray) else stats['Equity Final [$]']),
            'totalReturn': float(stats['Return [%]']),
            'annualReturn': float(stats.get('Return (Ann.) [%]', 0)),
            'volatility': float(stats.get('Volatility (Ann.) [%]', 0)),
            'sharpeRatio': float(stats.get('Sharpe Ratio', 0)),
            'maxDrawdown': float(stats.get('Max. Drawdown [%]', 0)),
            'totalTrades': int(stats.get('# Trades', 0)),
            'winningTrades': int(stats.get('Win Rate [%]', 0) * stats.get('# Trades', 0) / 100) if stats.get('# Trades', 0) else 0,
            'losingTrades': int(stats.get('# Trades', 0)) - (int(stats.get('Win Rate [%]', 0) * stats.get('# Trades', 0) / 100) if stats.get('# Trades', 0) else 0),
            'winRate': float(stats.get('Win Rate [%]', 0)),
            'averageProfitPerTrade': float(stats.get('Avg. Trade [%]', 0)),
            'largestWin': float(stats.get('Best Trade [%]', 0)),
            'largestLoss': float(stats.get('Worst Trade [%]', 0)),
            'profitFactor': float(stats.get('Profit Factor', 0)),
            'finalEquity': float(stats.get('Equity Final [$]')), 
            'peakEquity': float(np.max(bt._equity_curve['Equity'])),
            'equityCurve': equity_curve,
            'trades': trades
        }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class GAParam(BaseModel):
    min: float
    max: float
    step: float


class GAConfig(BaseModel):
    population_size: int = 50
    generations: int = 20
    crossover_rate: float = 0.8
    mutation_rate: float = 0.15
    elite_percentage: float = 0.1


class OptimizeRequest(BaseModel):
    dsl: Dict[str, Any]
    ohlcv: List[Dict[str, Any]] | None = None
    initial_capital: float = 10000.0
    parameters: Dict[str, GAParam]  # e.g., {"ema_fast_length": {min,max,step}, ...}
    objective_weights: Dict[str, float] = {
        'profit_factor': 0.35,
        'sharpe_ratio': 0.30,
        'max_drawdown': -0.20,
        'win_rate': 0.10,
        'trade_frequency': 0.05,
    }
    constraints: Dict[str, Any] = {}
    ga: GAConfig = GAConfig()


def _random_param_value(p: GAParam) -> float:
    steps = int(round((p.max - p.min) / p.step))
    k = random.randint(0, max(0, steps))
    return p.min + k * p.step


def _fitness(params: Dict[str, Any], df: pd.DataFrame, initial_capital: float, objective_weights: Dict[str, float], constraints: Dict[str, Any]):
    StrategyClass = _build_strategy_from_params(params)
    bt = Backtest(df, StrategyClass, cash=initial_capital, commission=.0002)
    stats = bt.run()

    # Collect metrics
    profit_factor = float(stats.get('Profit Factor', 0) or 0)
    sharpe = float(stats.get('Sharpe Ratio', 0) or 0)
    max_dd = float(stats.get('Max. Drawdown [%]', 0) or 0)
    win_rate = float(stats.get('Win Rate [%]', 0) or 0)
    total_trades = int(stats.get('# Trades', 0) or 0)
    trade_freq = total_trades / max(1, len(df)) * 1000.0

    # Constraints penalties
    penalty = 0.0
    if constraints:
        if 'minimum_trades' in constraints and total_trades < constraints['minimum_trades']:
            penalty += 1.0
        if 'max_drawdown_cap' in constraints and max_dd > constraints['max_drawdown_cap']:
            penalty += 1.0
        if 'minimum_win_rate' in constraints and win_rate < constraints['minimum_win_rate']:
            penalty += 1.0
        if 'minimum_profit_factor' in constraints and profit_factor < constraints['minimum_profit_factor']:
            penalty += 1.0
        if 'minimum_sharpe_ratio' in constraints and sharpe < constraints['minimum_sharpe_ratio']:
            penalty += 1.0

    score = (
        objective_weights.get('profit_factor', 0) * profit_factor +
        objective_weights.get('sharpe_ratio', 0) * sharpe +
        objective_weights.get('max_drawdown', 0) * (-max_dd) +
        objective_weights.get('win_rate', 0) * (win_rate / 100.0) +
        objective_weights.get('trade_frequency', 0) * trade_freq
    ) - penalty * 10.0

    equity_curve = [{'time': str(idx), 'equity': float(val)} for idx, val in bt._equity_curve['Equity'].items()]
    result = {
        'params': params,
        'score': score,
        'metrics': {
            'profitFactor': profit_factor,
            'sharpeRatio': sharpe,
            'maxDrawdown': max_dd,
            'winRate': win_rate,
            'totalTrades': total_trades,
            'finalEquity': float(stats.get('Equity Final [$]')),
        },
        'equitySample': equity_curve[:200]
    }
    return result


@app.post("/optimize/run")
def optimize(req: OptimizeRequest):
    try:
        # Prepare data
        if req.ohlcv:
            df = pd.DataFrame(req.ohlcv)
            df.index = pd.to_datetime(df['time'])
            df = df.rename(columns={'open':'Open','high':'High','low':'Low','close':'Close','volume':'Volume'})
            df = df[['Open','High','Low','Close','Volume']]
        else:
            df = GOOG

        # Initialize population
        def sample_params():
            return {k: _random_param_value(v) for k, v in req.parameters.items()}

        population = [sample_params() for _ in range(req.ga.population_size)]
        best_history = []

        for gen in range(req.ga.generations):
            with ThreadPoolExecutor(max_workers=4) as pool:
                results = list(pool.map(lambda p: _fitness(p, df, req.initial_capital, req.objective_weights, req.constraints), population))
            results.sort(key=lambda r: r['score'], reverse=True)
            elite_n = max(1, int(req.ga.elite_percentage * len(population)))
            new_pop = [r['params'] for r in results[:elite_n]]
            best_history.append({'generation': gen, 'bestScore': results[0]['score'], 'bestParams': results[0]['params']})

            # Generate offspring
            while len(new_pop) < req.ga.population_size:
                if random.random() < req.ga.crossover_rate and len(results) >= 2:
                    p1 = random.choice(results[:len(results)//2])['params']
                    p2 = random.choice(results[:len(results)//2])['params']
                    child = {}
                    for k in req.parameters.keys():
                        child[k] = p1[k] if random.random() < 0.5 else p2[k]
                else:
                    child = sample_params()

                # Mutation
                for k, rng in req.parameters.items():
                    if random.random() < req.ga.mutation_rate:
                        child[k] = _random_param_value(rng)

                new_pop.append(child)

            population = new_pop

        # Final evaluation
        final_results = [_fitness(p, df, req.initial_capital, req.objective_weights, req.constraints) for p in population]
        final_results.sort(key=lambda r: r['score'], reverse=True)
        best = final_results[0]
        top = final_results[:10]
        return { 'best': best, 'top': top, 'history': best_history }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

