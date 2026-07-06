export interface WalkabilityPoint {
  id: string
  position: [number, number]
  score: number // 1-5 stars
}

let nextId = 0
export function makePointId(): string {
  nextId += 1
  return `point-${Date.now()}-${nextId}`
}

// Mock walkability scores around a city center.
// Swap this out for real data (e.g. computed from OSM amenity density).
export function generateMockWalkabilityData(
  center: [number, number],
  count = 400,
  spread = 0.03,
): WalkabilityPoint[] {
  const points: WalkabilityPoint[] = []
  for (let i = 0; i < count; i++) {
    const lng = center[0] + (Math.random() - 0.5) * spread
    const lat = center[1] + (Math.random() - 0.5) * spread
    // score biased toward the center to simulate a walkable downtown core
    const distance = Math.hypot(lng - center[0], lat - center[1]) / (spread / 2)
    const raw = Math.max(0, Math.min(1, (90 - distance * 70 + (Math.random() - 0.5) * 30) / 100))
    const score = Math.max(1, Math.min(5, Math.round(1 + raw * 4)))
    points.push({ id: makePointId(), position: [lng, lat], score })
  }
  return points
}
