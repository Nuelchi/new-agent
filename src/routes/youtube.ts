import { Router } from "express";
import { z } from "zod";
import { fetchTranscriptText } from "../services/transcript";
import { ClaudeOpenRouterProvider } from "../services/aiProvider";
import { StrategyDSLSchema } from "../domain/dsl";
import { exportCode } from "../services/exporters";

const router = Router();

const extractSchema = z.object({
	url: z.string().url(),
	format: z.enum(["mql4","mql5","pine","python","json"]).default("mql5"),
	interactive: z.boolean().default(true),
});

router.post("/extract", async (req, res) => {
	const parsed = extractSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

	try {
		const { text } = await fetchTranscriptText(parsed.data.url);
		const provider = new ClaudeOpenRouterProvider();
		const prompt = `From this YouTube transcript, infer a trading strategy for XAUUSD H1. Output a single JSON DSL. Transcript: ${text.slice(0, 8000)}`;
		const { dsl } = await provider.generateStrategy({ prompt });
		const dslParsed = StrategyDSLSchema.safeParse(dsl);
		if (!dslParsed.success) return res.status(500).json({ error: dslParsed.error.flatten() });

		if (parsed.data.interactive) {
			const questions: Array<{ key: string; question: string }> = [];
			if (dslParsed.data.filters?.newsFilter === undefined) questions.push({ key: "filters.newsFilter", question: "Enable news filter? (true/false)" });
			if (questions.length > 0) return res.json({ status: "questions", questions, draft: dslParsed.data });
		}

		const code = exportCode(dslParsed.data, parsed.data.format);
		return res.json({ dsl: dslParsed.data, codeFormat: parsed.data.format, code });
	} catch (err: any) {
		return res.status(500).json({ error: String(err?.message || err) });
	}
});

export default router;
