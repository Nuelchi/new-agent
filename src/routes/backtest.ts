import { Router } from "express";
import { z } from "zod";
import { runBacktestPython } from "../services/backtestClient";
import axios from "axios";
import { getDefaultsForSymbol, detectCategory, getDefaultsForCategory } from "../config/optimization";

const router = Router();

const runSchema = z.object({
  dsl: z.any(),
  ohlcv: z.array(z.object({
    time: z.union([z.string(), z.number()]),
    open: z.number(), high: z.number(), low: z.number(), close: z.number(), volume: z.number(),
  })).optional(),
  initialCapital: z.number().default(10000),
});

router.post("/run", async (req, res) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const result = await runBacktestPython({ dsl: parsed.data.dsl, ohlcv: parsed.data.ohlcv, initial_capital: parsed.data.initialCapital });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

const optimizeSchema = z.object({
  dsl: z.any(),
  ohlcv: z.array(z.object({
    time: z.union([z.string(), z.number()]),
    open: z.number(), high: z.number(), low: z.number(), close: z.number(), volume: z.number(),
  })).optional(),
  initialCapital: z.number().default(10000),
  parameters: z.record(z.string(), z.object({ min: z.number(), max: z.number(), step: z.number() })),
  objectiveWeights: z.record(z.string(), z.number()).optional(),
  constraints: z.record(z.string(), z.any()).optional(),
  ga: z.object({ population_size: z.number(), generations: z.number(), crossover_rate: z.number(), mutation_rate: z.number(), elite_percentage: z.number() }).optional(),
});

router.post("/optimize", async (req, res) => {
  const parsed = optimizeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const baseURL = process.env.BACKTEST_SERVICE_URL || "http://localhost:8001";
    const symbol = Array.isArray(parsed.data.dsl?.symbols) ? parsed.data.dsl.symbols[0] : undefined;
    const defaults = getDefaultsForSymbol(symbol || "XAUUSD") || getDefaultsForCategory(detectCategory(symbol || "XAUUSD"));
    const { data } = await axios.post(baseURL + "/optimize/run", {
      dsl: parsed.data.dsl,
      ohlcv: parsed.data.ohlcv,
      initial_capital: parsed.data.initialCapital,
      parameters: parsed.data.parameters || defaults?.parameters,
      objective_weights: parsed.data.objectiveWeights || defaults?.objectiveWeights,
      constraints: parsed.data.constraints || defaults?.constraints,
      ga: parsed.data.ga || defaults?.ga,
    }, { timeout: 600_000 });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

export default router;
