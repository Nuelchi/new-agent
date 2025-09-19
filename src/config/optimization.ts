export type Range = { min: number; max: number; step: number };

export type ParameterMap = Record<string, Range>;

export type GASettings = {
	population_size: number;
	generations: number;
	crossover_rate: number;
	mutation_rate: number;
	elite_percentage: number;
};

export type ObjectiveWeights = Record<string, number>;

export type Constraints = Record<string, number>;

export type MarketDefaults = {
	parameters: ParameterMap;
	ga: GASettings;
	objectiveWeights: ObjectiveWeights;
	constraints: Constraints;
};

const xauusdParameters: ParameterMap = {
	// Trend following
	ema_fast_length: { min: 5, max: 15, step: 1 },
	ema_medium_length: { min: 18, max: 35, step: 1 },
	ema_slow_length: { min: 45, max: 80, step: 2 },
	// Momentum
	rsi_length: { min: 10, max: 21, step: 1 },
	rsi_oversold: { min: 20, max: 35, step: 1 },
	rsi_overbought: { min: 65, max: 80, step: 1 },
	stochastic_k: { min: 10, max: 18, step: 1 },
	stochastic_oversold: { min: 15, max: 25, step: 1 },
	stochastic_overbought: { min: 75, max: 85, step: 1 },
	// Volatility
	atr_length: { min: 10, max: 20, step: 1 },
	atr_sl_multiplier: { min: 1.2, max: 2.5, step: 0.1 },
	atr_tp_multiplier: { min: 2.0, max: 5.0, step: 0.2 },
	bb_length: { min: 16, max: 25, step: 1 },
	bb_deviation: { min: 1.8, max: 2.5, step: 0.1 },
	// Additional
	macd_fast: { min: 10, max: 15, step: 1 },
	macd_slow: { min: 22, max: 30, step: 1 },
	macd_signal: { min: 8, max: 12, step: 1 },
	volume_surge_multiplier: { min: 1.1, max: 1.8, step: 0.1 },
	lookback_period: { min: 3, max: 8, step: 1 },
};

const xauusdGA: GASettings = {
	population_size: 150,
	generations: 80,
	crossover_rate: 0.75,
	mutation_rate: 0.15,
	elite_percentage: 0.1,
};

const defaultObjective: ObjectiveWeights = {
	profit_factor: 0.35,
	sharpe_ratio: 0.30,
	max_drawdown: -0.20,
	win_rate: 0.10,
	trade_frequency: 0.05,
};

const xauusdConstraints: Constraints = {
	minimum_trades: 50,
	max_drawdown_cap: 25.0,
	minimum_win_rate: 40.0,
	minimum_profit_factor: 1.3,
	maximum_consecutive_losses: 8,
	minimum_sharpe_ratio: 0.8,
};

export const marketDefaults: Record<string, MarketDefaults> = {
	XAUUSD: {
		parameters: xauusdParameters,
		ga: xauusdGA,
		objectiveWeights: defaultObjective,
		constraints: xauusdConstraints,
	},
};

const categoryPatterns = {
	forex_majors: ["EUR", "GBP", "USD", "JPY", "CHF", "AUD", "CAD", "NZD"],
	forex_exotics: ["ZAR", "TRY", "BRL", "MXN", "PLN", "CZK", "HUF"],
	crypto: ["BTC", "ETH", "BNB", "XRP", "ADA", "SOL", "DOT", "DOGE", "SHIB"],
	futures_indices: ["ES", "NQ", "YM", "RTY", "DAX", "FTSE", "NIKKEI"],
	futures_commodities: ["CL", "GC", "SI", "NG", "ZW", "ZC", "ZS", "KC", "SB"],
	precious_metals: ["XAU", "XAG", "XPT", "XPD", "GOLD", "SILVER"],
};

export function detectCategory(symbol: string): string | null {
	const up = symbol.toUpperCase();
	for (const [cat, patterns] of Object.entries(categoryPatterns)) {
		if (patterns.some(p => up.includes(p))) return cat;
	}
	return null;
}

export function getDefaultsForSymbol(symbol?: string): MarketDefaults | null {
	if (!symbol) return null;
	const up = symbol.toUpperCase();
	if (marketDefaults[up]) return marketDefaults[up];
	// For now, fall back to XAUUSD for precious metals
	if (detectCategory(up) === 'precious_metals') return marketDefaults['XAUUSD'] as MarketDefaults;
	return null;
}

// Category-level defaults from user specs
const forexMajorsParams: ParameterMap = {
    ema_fast_length: { min: 8, max: 21, step: 1 },
    ema_medium_length: { min: 25, max: 50, step: 2 },
    ema_slow_length: { min: 80, max: 200, step: 5 },
    rsi_length: { min: 12, max: 18, step: 1 },
    rsi_oversold: { min: 25, max: 35, step: 1 },
    rsi_overbought: { min: 65, max: 75, step: 1 },
    stochastic_oversold: { min: 18, max: 25, step: 1 },
    stochastic_overbought: { min: 75, max: 82, step: 1 },
    atr_sl_multiplier: { min: 1.0, max: 2.0, step: 0.1 },
    atr_tp_multiplier: { min: 1.8, max: 3.5, step: 0.2 },
    bb_deviation: { min: 1.8, max: 2.2, step: 0.1 },
};

const forexExoticsParams: ParameterMap = {
    ema_fast_length: { min: 6, max: 15, step: 1 },
    ema_medium_length: { min: 20, max: 35, step: 1 },
    ema_slow_length: { min: 50, max: 100, step: 3 },
    rsi_oversold: { min: 15, max: 30, step: 1 },
    rsi_overbought: { min: 70, max: 85, step: 1 },
    atr_sl_multiplier: { min: 1.8, max: 3.0, step: 0.2 },
    atr_tp_multiplier: { min: 2.5, max: 5.0, step: 0.3 },
};

const cryptoMajorsParams: ParameterMap = {
    ema_fast_length: { min: 5, max: 12, step: 1 },
    ema_medium_length: { min: 15, max: 25, step: 1 },
    ema_slow_length: { min: 35, max: 65, step: 2 },
    rsi_length: { min: 9, max: 16, step: 1 },
    rsi_oversold: { min: 15, max: 25, step: 1 },
    rsi_overbought: { min: 75, max: 88, step: 1 },
    stochastic_oversold: { min: 10, max: 20, step: 1 },
    stochastic_overbought: { min: 80, max: 92, step: 1 },
    atr_sl_multiplier: { min: 2.0, max: 4.0, step: 0.2 },
    atr_tp_multiplier: { min: 3.0, max: 8.0, step: 0.5 },
    bb_deviation: { min: 2.2, max: 3.0, step: 0.1 },
};

const cryptoAltParams: ParameterMap = {
    ema_fast_length: { min: 4, max: 10, step: 1 },
    ema_medium_length: { min: 12, max: 20, step: 1 },
    ema_slow_length: { min: 25, max: 45, step: 2 },
    rsi_oversold: { min: 10, max: 22, step: 1 },
    rsi_overbought: { min: 78, max: 95, step: 1 },
    atr_sl_multiplier: { min: 3.0, max: 6.0, step: 0.3 },
    atr_tp_multiplier: { min: 5.0, max: 12.0, step: 0.5 },
};

const futuresIdxParams: ParameterMap = {
    ema_fast_length: { min: 8, max: 18, step: 1 },
    ema_medium_length: { min: 25, max: 40, step: 2 },
    ema_slow_length: { min: 60, max: 150, step: 5 },
    rsi_oversold: { min: 20, max: 30, step: 1 },
    rsi_overbought: { min: 68, max: 78, step: 1 },
    atr_sl_multiplier: { min: 1.2, max: 2.2, step: 0.1 },
    atr_tp_multiplier: { min: 2.0, max: 4.0, step: 0.2 },
};

const futuresCmdParams: ParameterMap = {
    ema_fast_length: { min: 6, max: 16, step: 1 },
    ema_medium_length: { min: 20, max: 35, step: 2 },
    ema_slow_length: { min: 50, max: 120, step: 5 },
    rsi_oversold: { min: 18, max: 32, step: 1 },
    rsi_overbought: { min: 68, max: 82, step: 1 },
    atr_sl_multiplier: { min: 1.5, max: 3.5, step: 0.2 },
    atr_tp_multiplier: { min: 2.2, max: 6.0, step: 0.3 },
};

const gaByMarket: Record<string, GASettings> = {
    forex_majors: { population_size: 120, generations: 60, crossover_rate: 0.8, mutation_rate: 0.12, elite_percentage: 0.1 },
    forex_exotics: { population_size: 180, generations: 85, crossover_rate: 0.75, mutation_rate: 0.18, elite_percentage: 0.1 },
    crypto: { population_size: 200, generations: 100, crossover_rate: 0.7, mutation_rate: 0.22, elite_percentage: 0.1 },
    crypto_alt: { population_size: 250, generations: 120, crossover_rate: 0.65, mutation_rate: 0.25, elite_percentage: 0.1 },
    futures_indices: { population_size: 100, generations: 50, crossover_rate: 0.82, mutation_rate: 0.1, elite_percentage: 0.1 },
    futures_commodities: { population_size: 150, generations: 70, crossover_rate: 0.78, mutation_rate: 0.15, elite_percentage: 0.1 },
};

const constraintsByMarket: Record<string, Constraints> = {
    forex_majors: { minimum_trades: 60, max_drawdown_cap: 15.0, minimum_win_rate: 42.0, minimum_profit_factor: 1.4 },
    forex_exotics: { minimum_trades: 40, max_drawdown_cap: 30.0, minimum_win_rate: 38.0, minimum_profit_factor: 1.3 },
    crypto: { minimum_trades: 30, max_drawdown_cap: 40.0, minimum_win_rate: 35.0, minimum_profit_factor: 1.5 },
    crypto_alt: { minimum_trades: 25, max_drawdown_cap: 50.0, minimum_win_rate: 30.0, minimum_profit_factor: 2.0 },
    futures_indices: { minimum_trades: 50, max_drawdown_cap: 18.0, minimum_win_rate: 45.0, minimum_profit_factor: 1.4 },
    futures_commodities: { minimum_trades: 35, max_drawdown_cap: 25.0, minimum_win_rate: 40.0, minimum_profit_factor: 1.3 },
};

export const categoryDefaults: Record<string, MarketDefaults> = {
    forex_majors: { parameters: forexMajorsParams, ga: gaByMarket['forex_majors'] as GASettings, objectiveWeights: defaultObjective, constraints: constraintsByMarket['forex_majors'] as Constraints },
    forex_exotics: { parameters: forexExoticsParams, ga: gaByMarket['forex_exotics'] as GASettings, objectiveWeights: defaultObjective, constraints: constraintsByMarket['forex_exotics'] as Constraints },
    crypto: { parameters: cryptoMajorsParams, ga: gaByMarket['crypto'] as GASettings, objectiveWeights: defaultObjective, constraints: constraintsByMarket['crypto'] as Constraints },
    crypto_alt: { parameters: cryptoAltParams, ga: gaByMarket['crypto_alt'] as GASettings, objectiveWeights: defaultObjective, constraints: constraintsByMarket['crypto_alt'] as Constraints },
    futures_indices: { parameters: futuresIdxParams, ga: gaByMarket['futures_indices'] as GASettings, objectiveWeights: defaultObjective, constraints: constraintsByMarket['futures_indices'] as Constraints },
    futures_commodities: { parameters: futuresCmdParams, ga: gaByMarket['futures_commodities'] as GASettings, objectiveWeights: defaultObjective, constraints: constraintsByMarket['futures_commodities'] as Constraints },
};

export function getDefaultsForCategory(category: string | null): MarketDefaults | null {
    if (!category) return null;
    return categoryDefaults[category] || null;
}

