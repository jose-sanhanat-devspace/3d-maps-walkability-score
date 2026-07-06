import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db'

interface ShapeInput {
  id: string
  path: [number, number][]
  score: number
  closed: boolean
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const shapes: ShapeInput[] = Array.isArray(req.body?.shapes) ? req.body.shapes : []
  const sql = getSql()

  await sql`DELETE FROM shapes`
  if (shapes.length > 0) {
    // Single round trip: unnest the JSON array into rows instead of one
    // INSERT per shape, which avoids firing hundreds of concurrent queries.
    await sql`
      INSERT INTO shapes (id, path, score, closed)
      SELECT
        (elem->>'id')::text,
        (elem->'path')::jsonb,
        (elem->>'score')::int,
        (elem->>'closed')::boolean
      FROM jsonb_array_elements(${JSON.stringify(shapes)}::jsonb) AS elem
    `
  }

  res.status(200).json(shapes)
}
