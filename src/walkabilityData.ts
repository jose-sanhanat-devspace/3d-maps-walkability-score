export interface WalkabilityPoint {
  position: [number, number]
  score: number // 0-100
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
    const score = Math.max(0, Math.min(100, 90 - distance * 70 + (Math.random() - 0.5) * 30))
    points.push({ position: [lng, lat], score })
  }
  return points
}
