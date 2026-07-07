import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db.js'

function isStarScore(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const sql = getSql()
  const {
    id,
    startPinId,
    startLng,
    startLat,
    endPinId,
    endLng,
    endLat,
    feelSafe,
    cleanEasy,
    reachDestination,
    distanceMeters,
  } = req.body ?? {}

  if (
    typeof id !== 'string' ||
    typeof startPinId !== 'string' ||
    typeof endPinId !== 'string' ||
    typeof startLng !== 'number' ||
    typeof startLat !== 'number' ||
    typeof endLng !== 'number' ||
    typeof endLat !== 'number' ||
    !isStarScore(feelSafe) ||
    !isStarScore(cleanEasy) ||
    !isStarScore(reachDestination) ||
    typeof distanceMeters !== 'number'
  ) {
    res.status(400).json({ error: 'Invalid rating payload' })
    return
  }

  await sql`
    INSERT INTO pavement_ratings
      (id, start_pin_id, start_lng, start_lat, end_pin_id, end_lng, end_lat, feel_safe, clean_easy, reach_destination, distance_meters)
    VALUES
      (${id}, ${startPinId}, ${startLng}, ${startLat}, ${endPinId}, ${endLng}, ${endLat}, ${feelSafe}, ${cleanEasy}, ${reachDestination}, ${distanceMeters})
  `

  res.status(201).json({ id })
}
