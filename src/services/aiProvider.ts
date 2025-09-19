import { StrategyDSL } from "../domain/dsl";
import { STRATEGY_SEEDS } from "../seeds/strategySeeds";

export type GenerateStrategyRequest = {
	prompt: string;
	seedExamples?: Array<Partial<StrategyDSL>>;
};

export type GenerateStrategyResponse = {
	dsl: StrategyDSL;
};

export interface AIProvider {
	generateStrategy(input: GenerateStrategyRequest): Promise<GenerateStrategyResponse>;
}

// Claude via OpenRouter provider
export class ClaudeOpenRouterProvider implements AIProvider {
    private readonly apiKey: string;
    private readonly model: string;

    constructor(apiKey = process.env.OPENROUTER_API_KEY || "", model = process.env.DEFAULT_AI_MODEL || process.env.CLAUDE_MODEL || "anthropic/claude-3.5-sonnet") {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateStrategy(input: GenerateStrategyRequest): Promise<GenerateStrategyResponse> {
        if (!this.apiKey) {
            throw new Error("Missing OPENROUTER_API_KEY");
        }

        // Minimal prompt to elicit a JSON DSL object matching our schema
        const system = `You output ONLY JSON matching the StrategyDSLSchema. No prose.`;
        const seeds = JSON.stringify(STRATEGY_SEEDS.slice(0, 3));
        const user = `You will create ONE JSON DSL object. Use these seed examples as style guides: ${seeds}. Convert this request into the DSL with fields: name, description, symbols(default [\"XAUUSD\"]), timeframe(default \"H1\"), entryType(\"market\"), filters{newsFilter}, indicators[], entries[], exits[], risk{riskPercent, stopLoss, takeProfit}. Defaults: riskPercent=1, stopLoss=60, takeProfit=120. Prompt: ${input.prompt}`;

        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
                response_format: { type: "json_object" },
                temperature: 0.2,
            }),
        });

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`OpenRouter error: ${resp.status} ${text}`);
        }

        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(content);
        return { dsl: parsed };
    }
}

