import { useEffect, useState } from 'react'

interface ManholeFormProps {
  saving: boolean
  onSave: (data: { file: File | null; touristSpot: string }) => void
  onCancel: () => void
}

function ManholeForm({ saving, onSave, onCancel }: ManholeFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [touristSpot, setTouristSpot] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className="card manhole-form">
      <label className="header" style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}>
        {!previewUrl && <span>📷 Add cover photo</span>}
        <input
          type="file"
          accept="image/*"
          disabled={saving}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="info">
        <p className="title">New Pin</p>
        <textarea
          rows={3}
          disabled={saving}
          value={touristSpot}
          onChange={(e) => setTouristSpot(e.target.value)}
          placeholder="Nearby tourist spot, e.g. 150m from Wat Hua Lamphong"
        />
      </div>

      <div className="footer">
        <button type="button" className="tag" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="action" disabled={saving} onClick={() => onSave({ file, touristSpot })}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default ManholeForm
