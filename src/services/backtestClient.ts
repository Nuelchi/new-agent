import axios from "axios";

export async function runBacktestPython(payload: any) {
	const baseURL = process.env.BACKTEST_SERVICE_URL || "http://localhost:8001";
	const { data } = await axios.post(baseURL + "/run", payload, { timeout: 60_000 });
	return data;
}

