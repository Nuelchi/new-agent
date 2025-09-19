import { Router } from "express";
import { z } from "zod";
import { runBacktestPython } from "../services/backtestClient";

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

export default router;
