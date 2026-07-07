import type { ShapeCategory, WalkabilityShape } from './walkabilityData'

export async function fetchShapes(): Promise<WalkabilityShape[]> {
  const res = await fetch('/api/shapes')
  if (!res.ok) throw new Error(`Failed to fetch shapes: ${res.status}`)
  return res.json()
}

export async function createShape(shape: WalkabilityShape): Promise<void> {
  const res = await fetch('/api/shapes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shape),
  })
  if (!res.ok) throw new Error(`Failed to save shape: ${res.status}`)
}

export async function deleteShape(id: string): Promise<void> {
  const res = await fetch(`/api/shapes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete shape: ${res.status}`)
}

export async function resetShapes(shapes: WalkabilityShape[], category: ShapeCategory): Promise<void> {
  const res = await fetch('/api/shapes/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shapes, category }),
  })
  if (!res.ok) throw new Error(`Failed to reset shapes: ${res.status}`)
}
