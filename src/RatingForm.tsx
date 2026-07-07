import { useState } from 'react'
import StarRating from './StarRating'
import type { PavementRatingInput } from './ratingData'

interface RatingFormProps {
  saving: boolean
  onSubmit: (data: PavementRatingInput) => void
  onCancel: () => void
}

function RatingForm({ saving, onSubmit, onCancel }: RatingFormProps) {
  const [feelSafe, setFeelSafe] = useState(3)
  const [cleanEasy, setCleanEasy] = useState(3)
  const [reachDestination, setReachDestination] = useState(3)

  return (
    <div className="rating-form">
      <h2>Rate This Route</h2>

      <div className="rating-row">
        <span className="field-label">Feel safe</span>
        <StarRating value={feelSafe} onChange={setFeelSafe} size={20} />
      </div>

      <div className="rating-row">
        <span className="field-label">Clean and easy to walk</span>
        <StarRating value={cleanEasy} onChange={setCleanEasy} size={20} />
      </div>

      <div className="rating-row">
        <span className="field-label">Get to destination</span>
        <StarRating value={reachDestination} onChange={setReachDestination} size={20} />
      </div>

      <div className="draw-actions">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSubmit({ feelSafe, cleanEasy, reachDestination })}
        >
          {saving ? 'Submitting…' : 'Submit'}
        </button>
        <button type="button" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default RatingForm
