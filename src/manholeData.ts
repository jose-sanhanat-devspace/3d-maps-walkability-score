export interface ManholeCover {
  id: string
  lng: number
  lat: number
  imageUrl: string | null
  touristSpot: string
}

let nextId = 0
export function makeManholeId(): string {
  nextId += 1
  return `manhole-${Date.now()}-${nextId}`
}
