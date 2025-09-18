import { Router } from "express";
import { z } from "zod";

const router = Router();

const extractSchema = z.object({ url: z.string().url() });

router.post("/extract", async (req, res) => {
  const parsed = extractSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const url = parsed.data.url;
  const jobId = "yt_" + Date.now();
  res.json({ jobId, url, status: "queued" });
});

export default router;
