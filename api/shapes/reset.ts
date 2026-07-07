import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db.js'

const VALID_CATEGORIES = new Set(['walkability', 'priority'])

interface ShapeInput {
  id: string
  path: [number, number][]
  score: number
  closed: boolean
  category: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const category = req.body?.category
  if (!VALID_CATEGORIES.has(category)) {
    res.status(400).json({ error: 'Invalid category' })
    return
  }

  const shapes: ShapeInput[] = Array.isArray(req.body?.shapes) ? req.body.shapes : []
  const sql = getSql()

  // Only wipe the category being reset, so resetting one dataset never
  // touches the other's shapes.
  await sql`DELETE FROM shapes WHERE category = ${category}`
  if (shapes.length > 0) {
    // Single round trip: unnest the JSON array into rows instead of one
    // INSERT per shape, which avoids firing hundreds of concurrent queries.
    await sql`
      INSERT INTO shapes (id, path, score, closed, category)
      SELECT
        (elem->>'id')::text,
        (elem->'path')::jsonb,
        (elem->>'score')::int,
        (elem->>'closed')::boolean,
        (elem->>'category')::text
      FROM jsonb_array_elements(${JSON.stringify(shapes)}::jsonb) AS elem
    `
  }

  res.status(200).json(shapes)
}
