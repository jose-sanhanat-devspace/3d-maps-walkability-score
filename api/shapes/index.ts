import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, path, score, closed FROM shapes ORDER BY created_at ASC`
    res.status(200).json(rows)
    return
  }

  if (req.method === 'POST') {
    const { id, path, score, closed } = req.body ?? {}
    if (
      typeof id !== 'string' ||
      !Array.isArray(path) ||
      typeof score !== 'number' ||
      typeof closed !== 'boolean'
    ) {
      res.status(400).json({ error: 'Invalid shape payload' })
      return
    }

    await sql`
      INSERT INTO shapes (id, path, score, closed)
      VALUES (${id}, ${JSON.stringify(path)}::jsonb, ${score}, ${closed})
    `
    res.status(201).json({ id, path, score, closed })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
