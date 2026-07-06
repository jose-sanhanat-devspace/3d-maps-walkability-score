import StarRating from './StarRating'

export type EditMode = 'add' | 'remove'

interface ControlPanelProps {
  mode: EditMode
  onModeChange: (mode: EditMode) => void
  score: number
  onScoreChange: (score: number) => void
  lineCount: number
  onReset: () => void
  drawingPointCount: number
  canClose: boolean
  onFinishLine: () => void
  onCancelLine: () => void
}

function ControlPanel({
  mode,
  onModeChange,
  score,
  onScoreChange,
  lineCount,
  onReset,
  drawingPointCount,
  canClose,
  onFinishLine,
  onCancelLine,
}: ControlPanelProps) {
  const isDrawing = drawingPointCount > 0

  return (
    <div className="control-panel">
      <h2>Customize Data</h2>

      <div className="mode-toggle">
        <button
          type="button"
          className={mode === 'add' ? 'active' : ''}
          onClick={() => onModeChange('add')}
        >
          Draw line
        </button>
        <button
          type="button"
          className={mode === 'remove' ? 'active' : ''}
          onClick={() => onModeChange('remove')}
        >
          Remove line
        </button>
      </div>

      {mode === 'add' ? (
        <div className="score-picker">
          <span>Score</span>
          <StarRating value={score} onChange={onScoreChange} size={22} />
          {isDrawing ? (
            <>
              <span className="hint">
                Drawing — {drawingPointCount} point{drawingPointCount === 1 ? '' : 's'}
                {canClose ? '. Click the green point to close the area.' : ''}
              </span>
              <div className="draw-actions">
                <button type="button" onClick={onFinishLine} disabled={drawingPointCount < 2}>
                  Finish line
                </button>
                <button type="button" onClick={onCancelLine}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <span className="hint">Click the map to start drawing a line or area</span>
          )}
        </div>
      ) : (
        <span className="hint">Click a line or area on the map to remove it</span>
      )}

      <div className="panel-footer">
        <span>{lineCount} shapes</span>
        <button type="button" className="reset" onClick={onReset}>
          Reset to mock data
        </button>
      </div>
    </div>
  )
}

export default ControlPanel
