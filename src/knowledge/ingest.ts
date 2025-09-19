import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { ensureSchema, getPool } from "./db";

async function fetchTextFromUrl(url: string): Promise<{ title: string; text: string }> {
  const { data } = await axios.get(url, { timeout: 30000 });
  const $ = cheerio.load(data);
  const title = ($("title").text() || url).trim();
  $("script,style,noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return { title, text };
}

function chunkText(text: string, max = 1200): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += max) chunks.push(text.slice(i, i + max));
  return chunks.filter(Boolean);
}

async function embedBatch(chunks: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  const model = process.env.EMBED_MODEL || "openai/text-embedding-3-large";
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
  const resp = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: chunks }),
  });
  if (!resp.ok) throw new Error(`embed error: ${resp.status}`);
  const data = await resp.json();
  return data.data.map((d: any) => d.embedding);
}

export async function ingestUrls(urls: string[]) {
  await ensureSchema();
  const pool = getPool();
  for (const url of urls) {
    const { title, text } = await fetchTextFromUrl(url);
    const chunks = chunkText(text);
    const embeddings = await embedBatch(chunks);
    for (let i = 0; i < chunks.length; i++) {
      const id = crypto.createHash("sha256").update(url + "::" + i).digest("hex");
      await pool.query(
        `INSERT INTO knowledge_chunks (id, source, title, content, embedding) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding`,
        [id, url, title, chunks[i], embeddings[i]]
      );
    }
  }
}

if (require.main === module) {
  const urls = process.argv.slice(2);
  ingestUrls(urls)
    .then(() => { console.log("Ingested", urls.length, "URLs"); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}

