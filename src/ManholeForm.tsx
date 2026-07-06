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
    <div className="manhole-form">
      <h2>New Art Manhole Cover</h2>

      <label className="manhole-form-field">
        Cover image
        <input
          type="file"
          accept="image/*"
          disabled={saving}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {previewUrl && <img src={previewUrl} alt="" className="manhole-form-preview" />}

      <label className="manhole-form-field">
        Nearby tourist spot
        <textarea
          rows={3}
          disabled={saving}
          value={touristSpot}
          onChange={(e) => setTouristSpot(e.target.value)}
          placeholder="e.g. 150m from Wat Hua Lamphong"
        />
      </label>

      <div className="draw-actions">
        <button type="button" disabled={saving} onClick={() => onSave({ file, touristSpot })}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ManholeForm
