import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, lng, lat, image_url AS "imageUrl", tourist_spot AS "touristSpot"
      FROM manholes ORDER BY created_at ASC
    `
    res.status(200).json(rows)
    return
  }

  if (req.method === 'POST') {
    const { id, lng, lat, imageUrl, touristSpot } = req.body ?? {}
    if (
      typeof id !== 'string' ||
      typeof lng !== 'number' ||
      typeof lat !== 'number' ||
      typeof touristSpot !== 'string' ||
      (imageUrl !== null && typeof imageUrl !== 'string')
    ) {
      res.status(400).json({ error: 'Invalid manhole payload' })
      return
    }

    await sql`
      INSERT INTO manholes (id, lng, lat, image_url, tourist_spot)
      VALUES (${id}, ${lng}, ${lat}, ${imageUrl ?? null}, ${touristSpot})
    `
    res.status(201).json({ id, lng, lat, imageUrl: imageUrl ?? null, touristSpot })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
