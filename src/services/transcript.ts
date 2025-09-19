import { YoutubeTranscript } from "youtube-transcript";

export type TranscriptResult = {
	text: string;
	segments: Array<{ text: string; duration?: number; offset?: number }>;
};

export async function fetchTranscriptText(url: string): Promise<TranscriptResult> {
	const segments = await YoutubeTranscript.fetchTranscript(url);
	const text = segments.map((s: any) => s.text).join(" ");
	return { text, segments };
}

