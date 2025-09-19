import { Router } from "express";
import { z } from "zod";
import { ingestUrls } from "../knowledge/ingest";
import { searchDocs } from "../knowledge/search";

const router = Router();

const ingestSchema = z.object({ urls: z.array(z.string().url()).min(1) });
router.post("/ingest", async (req, res) => {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    await ingestUrls(parsed.data.urls);
    res.json({ ok: true, count: parsed.data.urls.length });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

const searchSchema = z.object({ q: z.string().min(2), k: z.number().optional() });
router.post("/search", async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const rows = await searchDocs(parsed.data.q, parsed.data.k || 6);
    res.json({ results: rows });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

export default router;

