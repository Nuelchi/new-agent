import { Router } from "express";
import { z } from "zod";

const router = Router();

const runSchema = z.object({
  code: z.string().optional(),
  strategyId: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

router.post("/run", (req, res) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const jobId = "bt_" + Date.now();
  res.json({ jobId, status: "queued" });
});

export default router;
