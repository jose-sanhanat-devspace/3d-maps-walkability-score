import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db.js'

const VALID_CATEGORIES = new Set(['walkability', 'priority'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, path, score, closed, category FROM shapes ORDER BY created_at ASC`
    res.status(200).json(rows)
    return
  }

  if (req.method === 'POST') {
    const { id, path, score, closed, category } = req.body ?? {}
    if (
      typeof id !== 'string' ||
      !Array.isArray(path) ||
      typeof score !== 'number' ||
      typeof closed !== 'boolean' ||
      !VALID_CATEGORIES.has(category)
    ) {
      res.status(400).json({ error: 'Invalid shape payload' })
      return
    }

    await sql`
      INSERT INTO shapes (id, path, score, closed, category)
      VALUES (${id}, ${JSON.stringify(path)}::jsonb, ${score}, ${closed}, ${category})
    `
    res.status(201).json({ id, path, score, closed, category })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
