import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const id = req.query.id as string
  const sql = getSql()
  await sql`DELETE FROM shapes WHERE id = ${id}`
  res.status(204).end()
}
