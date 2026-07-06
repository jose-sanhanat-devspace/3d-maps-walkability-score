import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

await sql`
  CREATE TABLE IF NOT EXISTS shapes (
    id TEXT PRIMARY KEY,
    path JSONB NOT NULL,
    score INTEGER NOT NULL,
    closed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`

console.log('shapes table ready')
