import { StrategyDSL } from "../domain/dsl";

export const STRATEGY_SEEDS: StrategyDSL[] = [
	{
		name: "Gold Support Resistance Breakout",
		description: "Multi-timeframe support/resistance breakout with RSI confirmation",
		symbols: ["XAUUSD"],
		timeframe: "H1",
		entryType: "market",
		filters: { newsFilter: false, sessions: ["London","NewYork"] },
		indicators: [
			{ name: "EMA", params: { length: 21 } },
			{ name: "RSI", params: { length: 14 } },
			{ name: "ATR", params: { length: 14 } },
			{ name: "Bollinger", params: { length: 20, mult: 2 } },
		],
		entries: [
			{ description: "Long: Price breaks above BB upper with RSI momentum", expression: "price.close > bb_upper(20, 2) and rsi(14) > 60 and price.close > ema(21)" },
			{ description: "Short: Price breaks below BB lower with RSI momentum", expression: "price.close < bb_lower(20, 2) and rsi(14) < 40 and price.close < ema(21)" },
		],
		exits: [
			{ description: "Exit on opposite signal or EMA recross", expression: "cross(price.close, ema(21)) != 0" },
		],
		risk: { riskPercent: 1, stopLoss: "atr(14) * 1.5", takeProfit: "atr(14) * 3" },
	},
	{
		name: "Gold Mean Reversion Scalper",
		description: "RSI oversold/overbought with Bollinger Band mean reversion",
		symbols: ["XAUUSD"],
		timeframe: "H1",
		entryType: "market",
		filters: { newsFilter: false, sessions: ["London","NewYork"] },
		indicators: [
			{ name: "RSI", params: { length: 14 } },
			{ name: "Bollinger", params: { length: 20, mult: 2 } },
			{ name: "EMA", params: { length: 50 } },
			{ name: "Stochastic", params: { k: 14, d: 3 } },
		],
		entries: [
			{ description: "Long: Oversold bounce from BB lower", expression: "rsi(14) < 25 and price.close <= bb_lower(20, 2) and stoch_k(14, 3) < 20 and price.close > lowest(price.low, 5)" },
			{ description: "Short: Overbought rejection from BB upper", expression: "rsi(14) > 75 and price.close >= bb_upper(20, 2) and stoch_k(14, 3) > 80 and price.close < highest(price.high, 5)" },
		],
		exits: [
			{ description: "Exit at middle BB or RSI neutrality", expression: "cross(price.close, bb_basis(20, 2)) != 0 or (rsi(14) > 45 and rsi(14) < 55)" },
		],
		risk: { riskPercent: 1, stopLoss: "atr(14) * 2", takeProfit: "atr(14) * 2.5" },
	},
	{
		name: "Gold Trend Momentum Beast",
		description: "Multi-EMA trend following with MACD and volume confirmation",
		symbols: ["XAUUSD"],
		timeframe: "H1",
		entryType: "market",
		filters: { newsFilter: false, sessions: ["London","NewYork"] },
		indicators: [
			{ name: "EMA", params: { length: 9 } },
			{ name: "EMA", params: { length: 21 } },
			{ name: "EMA", params: { length: 50 } },
			{ name: "MACD", params: { fast: 12, slow: 26, signal: 9 } },
			{ name: "Volume", params: { length: 20 } },
			{ name: "ATR", params: { length: 14 } },
		],
		entries: [
			{ description: "Long: EMA alignment + MACD bullish + volume surge", expression: "ema(9) > ema(21) and ema(21) > ema(50) and crossover(macd_line(), macd_signal()) and volume > volume_sma(20) * 1.2" },
			{ description: "Short: EMA bearish alignment + MACD bearish + volume surge", expression: "ema(9) < ema(21) and ema(21) < ema(50) and crossunder(macd_line(), macd_signal()) and volume > volume_sma(20) * 1.2" },
		],
		exits: [
			{ description: "Exit on MACD signal cross or EMA misalignment", expression: "cross(macd_line(), macd_signal()) != 0 or cross(ema(9), ema(21)) != 0" },
		],
		risk: { riskPercent: 1, stopLoss: "atr(14) * 1.8", takeProfit: "atr(14) * 4" },
	},
];

