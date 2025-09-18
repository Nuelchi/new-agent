import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, service: "health", timestamp: new Date().toISOString() });
});

export default router;
