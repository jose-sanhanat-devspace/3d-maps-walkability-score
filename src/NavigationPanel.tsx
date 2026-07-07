import type { ManholeCover } from './manholeData'
import type { PavementRatingInput } from './ratingData'
import RatingForm from './RatingForm'

export type PickingTarget = 'start' | 'end' | null

interface NavigationPanelProps {
  pickingTarget: PickingTarget
  onPickingTargetChange: (target: PickingTarget) => void
  routeStart: ManholeCover | null
  routeEnd: ManholeCover | null
  onClear: () => void
  distanceLabel: string | null
  durationLabel: string | null
  pinCount: number
  showRatingForm: boolean
  onFinish: () => void
  ratingSaving: boolean
  onSubmitRating: (data: PavementRatingInput) => void
  onCancelRating: () => void
}

function pinLabel(pin: ManholeCover | null): string {
  if (!pin) return 'Not set'
  return pin.touristSpot.trim() || 'Untitled pin'
}

function NavigationPanel({
  pickingTarget,
  onPickingTargetChange,
  routeStart,
  routeEnd,
  onClear,
  distanceLabel,
  durationLabel,
  pinCount,
  showRatingForm,
  onFinish,
  ratingSaving,
  onSubmitRating,
  onCancelRating,
}: NavigationPanelProps) {
  const togglePicking = (target: 'start' | 'end') =>
    onPickingTargetChange(pickingTarget === target ? null : target)

  const routeReady = Boolean(distanceLabel && durationLabel)

  return (
    <div className="control-panel nav-panel">
      <h2>Navigate</h2>

      {pinCount === 0 ? (
        <span className="hint">No pins on the map yet — switch to Editor to add some.</span>
      ) : showRatingForm ? (
        <RatingForm saving={ratingSaving} onSubmit={onSubmitRating} onCancel={onCancelRating} />
      ) : (
        <>
          <div className="nav-row">
            <span className="field-label">Start</span>
            <div className="nav-row-content">
              <span className="nav-pin-label">{pinLabel(routeStart)}</span>
              <button
                type="button"
                className={pickingTarget === 'start' ? 'active' : ''}
                onClick={() => togglePicking('start')}
              >
                {pickingTarget === 'start' ? 'Click a pin…' : 'Set'}
              </button>
            </div>
          </div>

          <div className="nav-row">
            <span className="field-label">End</span>
            <div className="nav-row-content">
              <span className="nav-pin-label">{pinLabel(routeEnd)}</span>
              <button
                type="button"
                className={pickingTarget === 'end' ? 'active' : ''}
                onClick={() => togglePicking('end')}
              >
                {pickingTarget === 'end' ? 'Click a pin…' : 'Set'}
              </button>
            </div>
          </div>

          {routeReady ? (
            <>
              <div className="nav-result">
                <div>
                  <span className="field-label">Distance</span>
                  <strong>{distanceLabel}</strong>
                </div>
                <div>
                  <span className="field-label">Est. walk time</span>
                  <strong>{durationLabel}</strong>
                </div>
              </div>
              <div className="draw-actions">
                <button type="button" onClick={onFinish}>
                  Finish
                </button>
                <button type="button" onClick={onClear}>
                  Clear route
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="hint">Set both a start and end pin to estimate distance & time</span>
              {(routeStart || routeEnd) && (
                <button type="button" className="reset nav-clear" onClick={onClear}>
                  Clear route
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default NavigationPanel
