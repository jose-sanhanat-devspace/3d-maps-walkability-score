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
                Drawing line — {drawingPointCount} point{drawingPointCount === 1 ? '' : 's'}
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
            <span className="hint">Click the map to start drawing a line</span>
          )}
        </div>
      ) : (
        <span className="hint">Click a line on the map to remove it</span>
      )}

      <div className="panel-footer">
        <span>{lineCount} lines</span>
        <button type="button" className="reset" onClick={onReset}>
          Reset to mock data
        </button>
      </div>
    </div>
  )
}

export default ControlPanel
