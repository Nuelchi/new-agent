import { getPool } from "./db";

async function embedQuery(q: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  const model = process.env.EMBED_MODEL || "openai/text-embedding-3-large";
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
  const resp = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: [q] }),
  });
  if (!resp.ok) throw new Error(`embed error: ${resp.status}`);
  const data = await resp.json();
  return data.data[0].embedding;
}

export async function searchDocs(query: string, k = 6) {
  const pool = getPool();
  const emb = await embedQuery(query);
  const { rows } = await pool.query(
    `SELECT id, source, title, content, 1 - (embedding <=> $1::vector) AS score
     FROM knowledge_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`, [emb, k]
  );
  return rows;
}

