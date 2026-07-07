import type { PavementRatingPayload } from './ratingData'

export async function createRating(payload: PavementRatingPayload): Promise<void> {
  const res = await fetch('/api/ratings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to save rating: ${res.status}`)
}
