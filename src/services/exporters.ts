import { StrategyDSL } from "../domain/dsl";

export type ExportFormat = "json" | "pine" | "python" | "mql4" | "mql5";

export function exportJSON(dsl: StrategyDSL): string {
	return JSON.stringify(dsl, null, 2);
}

export function exportPine(dsl: StrategyDSL): string {
	const header = `//@version=5\nstrategy("${dsl.name}", overlay=true)`;
	const body = `// Simplified placeholder generated from DSL`;
	return [header, body].join("\n");
}

export function exportPython(dsl: StrategyDSL): string {
	return [
		"# Placeholder Python strategy generated from DSL",
		"def strategy(data):",
		"    # TODO: implement entries and exits",
		"    pass",
	].join("\n");
}

export function exportMQL4(dsl: StrategyDSL): string {
	return [
		"//+------------------------------------------------------------------+",
		"//|   Auto-generated EA (MQL4)                                     |",
		"//+------------------------------------------------------------------+",
		"int start(){",
		"   // TODO: implement from DSL",
		"   return(0);",
		"}",
	].join("\n");
}

export function exportMQL5(dsl: StrategyDSL): string {
	return [
		"//+------------------------------------------------------------------+",
		"//|   Auto-generated EA (MQL5)                                     |",
		"//+------------------------------------------------------------------+",
		"int OnInit(){ return(INIT_SUCCEEDED); }",
		"void OnTick(){",
		"   // TODO: implement from DSL",
		"}",
	].join("\n");
}

export function exportCode(dsl: StrategyDSL, format: ExportFormat): string {
	switch (format) {
		case "json":
			return exportJSON(dsl);
		case "pine":
			return exportPine(dsl);
		case "python":
			return exportPython(dsl);
		case "mql4":
			return exportMQL4(dsl);
		case "mql5":
			return exportMQL5(dsl);
		default:
			return exportJSON(dsl);
	}
}

