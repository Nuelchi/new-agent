from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List

from backtesting import Backtest, Strategy
from backtesting.lib import crossover
from backtesting.test import GOOG
import numpy as np
import pandas as pd

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


def _build_dummy_strategy():
    class S(Strategy):
        def init(self):
            self.ma1 = self.I(np.convolve, self.data.Close, np.ones(10)/10, mode='valid')
            self.ma2 = self.I(np.convolve, self.data.Close, np.ones(20)/20, mode='valid')

        def next(self):
            if crossover(self.ma1, self.ma2):
                self.buy()
            elif crossover(self.ma2, self.ma1):
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

        StrategyClass = _build_dummy_strategy()
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

