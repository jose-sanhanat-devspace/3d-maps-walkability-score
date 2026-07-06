import type { ManholeCover } from './manholeData'

export async function fetchManholes(): Promise<ManholeCover[]> {
  const res = await fetch('/api/manholes')
  if (!res.ok) throw new Error(`Failed to fetch manholes: ${res.status}`)
  return res.json()
}

export async function createManhole(manhole: ManholeCover): Promise<void> {
  const res = await fetch('/api/manholes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manhole),
  })
  if (!res.ok) throw new Error(`Failed to save manhole: ${res.status}`)
}

export async function deleteManhole(id: string): Promise<void> {
  const res = await fetch(`/api/manholes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete manhole: ${res.status}`)
}

async function resizeImage(file: File, maxDimension = 1600, quality = 0.75) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const contentType = 'image/jpeg'
  const dataUrl = canvas.toDataURL(contentType, quality)
  const dataBase64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return { dataBase64, contentType }
}

export async function uploadManholeImage(file: File): Promise<string> {
  const { dataBase64, contentType } = await resizeImage(file)
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType, dataBase64 }),
  })
  if (!res.ok) throw new Error(`Failed to upload image: ${res.status}`)
  const data = await res.json()
  return data.url as string
}
