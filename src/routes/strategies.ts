import { Router } from "express";
import { z } from "zod";
import { ClaudeOpenRouterProvider } from "../services/aiProvider";
import { StrategyDSLSchema } from "../domain/dsl";
import { exportCode } from "../services/exporters";

const router = Router();

const generateSchema = z.object({
	prompt: z.string().min(1),
	format: z.enum(["mql4","mql5","pine","python","json"]).default("mql5"),
	options: z.object({
		trailingStop: z.boolean().optional(),
		breakeven: z.boolean().optional(),
		partialTakeProfit: z.boolean().optional(),
		newsFilter: z.boolean().optional(),
	}).optional(),
    interactive: z.boolean().default(true),
});

router.post("/generate", async (req, res) => {
	const parsed = generateSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

	const provider = new ClaudeOpenRouterProvider();

	// Augment user prompt with interactive options so the LLM can incorporate them
	const opts = parsed.data.options || {};
	const optionsText = Object.keys(opts).length
		? ` User options: ${JSON.stringify(opts)}`
		: "";
	const { dsl } = await provider.generateStrategy({ prompt: parsed.data.prompt + optionsText });

	const dslParsed = StrategyDSLSchema.safeParse(dsl);
	if (!dslParsed.success) return res.status(500).json({ error: dslParsed.error.flatten() });

    if (parsed.data.interactive) {
        const questions: Array<{ key: string; question: string }> = [];
        if (dslParsed.data.filters?.newsFilter === undefined) questions.push({ key: "filters.newsFilter", question: "Enable news filter? (true/false)" });
        // Interactive toggles we support now
        if (opts.trailingStop === undefined) questions.push({ key: "risk.trailingStop", question: "Use trailing stop? (true/false)" });
        if (opts.breakeven === undefined) questions.push({ key: "risk.breakeven", question: "Move to breakeven after RR>=1? (true/false)" });
        if (opts.partialTakeProfit === undefined) questions.push({ key: "risk.partialTakeProfit", question: "Use partial take profit? (true/false)" });
        if (questions.length > 0) {
            return res.json({ status: "questions", questions, draft: dslParsed.data });
        }
    }

	const code = exportCode(dslParsed.data, parsed.data.format);
	res.json({ dsl: dslParsed.data, codeFormat: parsed.data.format, code });
});

router.post("/import", (req, res) => {
	res.json({ ok: true, message: "Import received" });
});

export default router;
