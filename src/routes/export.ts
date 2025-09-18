import { Router } from "express";
import { z } from "zod";

const router = Router();

const exportSchema = z.object({ strategyId: z.string(), format: z.enum(["mql4","mql5","zip"]).default("mql5") });

router.post("/mql", (req, res) => {
  const parsed = exportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const fileId = "file_" + Date.now();
  res.json({ fileId, status: "building" });
});

export default router;