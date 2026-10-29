import { neon } from '@neondatabase/serverless'
export function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}
export async function ensureSchema() {
  const sql = getDb()
  if (!sql) return
  await sql`CREATE TABLE IF NOT EXISTS beatmaps (id SERIAL PRIMARY KEY, fingerprint TEXT UNIQUE, filename TEXT, title TEXT, artist TEXT, creator TEXT, version TEXT, mode INT, content TEXT, created_at TIMESTAMPTZ DEFAULT now())`
}
