export interface PavementRatingInput {
  feelSafe: number
  cleanEasy: number
  reachDestination: number
}

export interface PavementRatingPayload extends PavementRatingInput {
  id: string
  startPinId: string
  startLng: number
  startLat: number
  endPinId: string
  endLng: number
  endLat: number
  distanceMeters: number
}

let nextId = 0
export function makeRatingId(): string {
  nextId += 1
  return `rating-${Date.now()}-${nextId}`
}
