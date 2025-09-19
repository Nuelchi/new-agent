import { z } from "zod";

export const RiskManagementSchema = z.object({
    // Percent of account per trade, 0-100
    riskPercent: z.number().min(0).max(100).default(1),
    // Stop loss can be a fixed number (pips/points) or an expression like "atr(14) * 1.5"
    stopLoss: z.union([z.number(), z.string()]).default(60),
    // Take profit can be a fixed number or expression
    takeProfit: z.union([z.number(), z.string()]).default(120),
    // Optional risk reward ratio for calculation helpers
    riskRewardRatio: z.number().positive().optional(),
});

export const IndicatorSchema = z.object({
	name: z.string(),
	params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).default({}),
});

export const ConditionSchema = z.object({
	description: z.string(),
	// Simple boolean expression string for now; can evolve into AST later
	expression: z.string(),
});

export const FiltersSchema = z.object({
    sessions: z.array(z.string()).optional(),
    newsFilter: z.boolean().default(false),
});

export const StrategyDSLSchema = z.object({
	name: z.string().min(1),
	description: z.string().default(""),
    symbols: z.array(z.string()).nonempty().default(["XAUUSD"]),
    timeframe: z.string().default("H1"),
	indicators: z.array(IndicatorSchema).default([]),
	entries: z.array(ConditionSchema).default([]),
	exits: z.array(ConditionSchema).default([]),
    entryType: z.enum(["market"]).default("market"),
    filters: FiltersSchema.default({ newsFilter: false }),
    risk: RiskManagementSchema.default({ riskPercent: 1, stopLoss: 60, takeProfit: 120 }),
});

export type StrategyDSL = z.infer<typeof StrategyDSLSchema>;
export type RiskManagement = z.infer<typeof RiskManagementSchema>;
export type StrategyIndicator = z.infer<typeof IndicatorSchema>;
export type StrategyCondition = z.infer<typeof ConditionSchema>;

