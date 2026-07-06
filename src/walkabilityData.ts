export interface WalkabilityLine {
  id: string
  path: [number, number][] // vertices, at least 2
  score: number // 1-5 stars
}

let nextId = 0
export function makeLineId(): string {
  nextId += 1
  return `line-${Date.now()}-${nextId}`
}

// Mock walkability scores around a city center, modeled as short street-like segments.
// Swap this out for real data (e.g. computed from OSM sidewalk/amenity density).
export function generateMockWalkabilityData(
  center: [number, number],
  count = 150,
  spread = 0.015,
): WalkabilityLine[] {
  const lines: WalkabilityLine[] = []
  for (let i = 0; i < count; i++) {
    const lng = center[0] + (Math.random() - 0.5) * spread
    const lat = center[1] + (Math.random() - 0.5) * spread
    const angle = Math.random() * Math.PI * 2
    const segmentLength = 0.0006 + Math.random() * 0.0009
    const lng2 = lng + Math.cos(angle) * segmentLength
    const lat2 = lat + Math.sin(angle) * segmentLength

    // score biased toward the center to simulate a walkable downtown core
    const distance = Math.hypot(lng - center[0], lat - center[1]) / (spread / 2)
    const raw = Math.max(0, Math.min(1, (90 - distance * 70 + (Math.random() - 0.5) * 30) / 100))
    const score = Math.max(1, Math.min(5, Math.round(1 + raw * 4)))

    lines.push({
      id: makeLineId(),
      path: [
        [lng, lat],
        [lng2, lat2],
      ],
      score,
    })
  }
  return lines
}
