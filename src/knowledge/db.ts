import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGVECTOR_HOST,
  port: parseInt(process.env.PGVECTOR_PORT || "5432", 10),
  database: process.env.PGVECTOR_DB,
  user: process.env.PGVECTOR_USER,
  password: process.env.PGVECTOR_PASSWORD,
  ssl: process.env.PGVECTOR_SSL === "true" ? { rejectUnauthorized: false } : false,
});

export async function ensureSchema() {
  // Enable extension and create table if not exists
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      embedding vector(3072)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);`);
}

export function getPool() { return pool; }

