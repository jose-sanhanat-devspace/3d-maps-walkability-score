export interface WalkabilityShape {
  id: string
  path: [number, number][] // vertices; if closed, this is the polygon ring (not repeating the first point)
  score: number // 1-5 stars
  closed: boolean // false = line segment, true = filled area
}

let nextId = 0
export function makeShapeId(): string {
  nextId += 1
  return `shape-${Date.now()}-${nextId}`
}

function scoreNear(center: [number, number], lng: number, lat: number, spread: number): number {
  // score biased toward the center to simulate a walkable downtown core
  const distance = Math.hypot(lng - center[0], lat - center[1]) / (spread / 2)
  const raw = Math.max(0, Math.min(1, (90 - distance * 70 + (Math.random() - 0.5) * 30) / 100))
  return Math.max(1, Math.min(5, Math.round(1 + raw * 4)))
}

function randomPolygon(cx: number, cy: number): [number, number][] {
  const sides = 3 + Math.floor(Math.random() * 4) // 3-6 sides
  const baseRadius = 0.0004 + Math.random() * 0.0006
  const path: [number, number][] = []
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + Math.random() * 0.5
    const radius = baseRadius * (0.7 + Math.random() * 0.6)
    path.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
  }
  return path
}

// Mock walkability scores around a city center: a mix of street-like line
// segments and small area blocks. Swap this out for real data (e.g. computed
// from OSM sidewalk/amenity density).
export function generateMockWalkabilityData(
  center: [number, number],
  count = 150,
  spread = 0.015,
  areaChance = 0.25,
): WalkabilityShape[] {
  const shapes: WalkabilityShape[] = []
  for (let i = 0; i < count; i++) {
    const lng = center[0] + (Math.random() - 0.5) * spread
    const lat = center[1] + (Math.random() - 0.5) * spread
    const score = scoreNear(center, lng, lat, spread)

    if (Math.random() < areaChance) {
      shapes.push({ id: makeShapeId(), path: randomPolygon(lng, lat), score, closed: true })
    } else {
      const angle = Math.random() * Math.PI * 2
      const segmentLength = 0.0006 + Math.random() * 0.0009
      const lng2 = lng + Math.cos(angle) * segmentLength
      const lat2 = lat + Math.sin(angle) * segmentLength
      shapes.push({
        id: makeShapeId(),
        path: [
          [lng, lat],
          [lng2, lat2],
        ],
        score,
        closed: false,
      })
    }
  }
  return shapes
}
