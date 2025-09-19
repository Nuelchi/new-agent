import { Router } from "express";
import { z } from "zod";
import { StrategyDSLSchema } from "../domain/dsl";
import { exportCode } from "../services/exporters";
import { saveCodeAsArtifact, getArtifactZipPath } from "../services/artifacts";

const router = Router();

const exportSchema = z.object({
    dsl: z.any().optional(),
    code: z.string().optional(),
    strategyName: z.string().optional(),
    format: z.enum(["mql4","mql5","pine","python","json"]).default("mql5"),
});

router.post("/mql", (req, res) => {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { dsl, code, strategyName, format } = parsed.data;
    let finalCode = code;
    let name = strategyName || (dsl && dsl.name) || "Strategy";
    if (!finalCode && dsl) {
        const dslParsed = StrategyDSLSchema.safeParse(dsl);
        if (!dslParsed.success) return res.status(400).json({ error: dslParsed.error.flatten() });
        finalCode = exportCode(dslParsed.data, format);
        name = dslParsed.data.name;
    }
    if (!finalCode) return res.status(400).json({ error: { message: "Provide either code or dsl" } });

    const ext = format === "mql4" ? "mq4" : format === "mql5" ? "mq5" : format === "pine" ? "pine" : format === "python" ? "py" : "json";
    const artifact = saveCodeAsArtifact(name, finalCode, ext);
    return res.json({ artifactId: artifact.id, zipPath: artifact.zipPath });
});

router.get("/download/:id", (req, res) => {
    const id = req.params.id;
    const zipPath = getArtifactZipPath(id);
    if (!zipPath) return res.status(404).json({ error: "Not found" });
    res.download(zipPath);
});

export default router;