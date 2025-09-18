import { Router } from "express";
import { z } from "zod";

const router = Router();

const generateSchema = z.object({
  prompt: z.string().min(1),
  language: z.enum(["mql4","mql5","pine","python","json"]).default("mql5"),
});

router.post("/generate", (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const jobId = "job_" + Date.now();
  res.json({ jobId, status: "queued" });
});

router.post("/import", (req, res) => {
  res.json({ ok: true, message: "Import received" });
});

export default router;
