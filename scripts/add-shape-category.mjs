import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

await sql`ALTER TABLE shapes ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'walkability'`

console.log('shapes.category column ready')
