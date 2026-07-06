import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put } from '@vercel/blob'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB decoded; base64 inflates ~33%, staying under Vercel's ~4.5 MB body limit

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { filename, contentType, dataBase64 } = req.body ?? {}
  if (typeof filename !== 'string' || typeof contentType !== 'string' || typeof dataBase64 !== 'string') {
    res.status(400).json({ error: 'Invalid upload payload' })
    return
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    res.status(400).json({ error: 'Unsupported image type' })
    return
  }

  const buffer = Buffer.from(dataBase64, 'base64')
  if (buffer.byteLength > MAX_BYTES) {
    res.status(413).json({ error: 'Image too large' })
    return
  }

  const blob = await put(`manholes/${Date.now()}-${filename}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  })

  res.status(201).json({ url: blob.url })
}
