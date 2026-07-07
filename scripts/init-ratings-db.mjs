import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

await sql`
  CREATE TABLE IF NOT EXISTS pavement_ratings (
    id TEXT PRIMARY KEY,
    start_pin_id TEXT NOT NULL,
    start_lng DOUBLE PRECISION NOT NULL,
    start_lat DOUBLE PRECISION NOT NULL,
    end_pin_id TEXT NOT NULL,
    end_lng DOUBLE PRECISION NOT NULL,
    end_lat DOUBLE PRECISION NOT NULL,
    feel_safe INTEGER NOT NULL,
    clean_easy INTEGER NOT NULL,
    reach_destination INTEGER NOT NULL,
    distance_meters DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`

console.log('pavement_ratings table ready')
