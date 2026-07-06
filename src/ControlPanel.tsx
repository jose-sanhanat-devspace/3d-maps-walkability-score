import StarRating from './StarRating'

export type EditMode = 'add' | 'remove'

interface ControlPanelProps {
  mode: EditMode
  onModeChange: (mode: EditMode) => void
  score: number
  onScoreChange: (score: number) => void
  pointCount: number
  onReset: () => void
}

function ControlPanel({ mode, onModeChange, score, onScoreChange, pointCount, onReset }: ControlPanelProps) {
  return (
    <div className="control-panel">
      <h2>Customize Data</h2>

      <div className="mode-toggle">
        <button
          type="button"
          className={mode === 'add' ? 'active' : ''}
          onClick={() => onModeChange('add')}
        >
          Add point
        </button>
        <button
          type="button"
          className={mode === 'remove' ? 'active' : ''}
          onClick={() => onModeChange('remove')}
        >
          Remove point
        </button>
      </div>

      {mode === 'add' ? (
        <div className="score-picker">
          <span>Score</span>
          <StarRating value={score} onChange={onScoreChange} size={22} />
          <span className="hint">Click the map to add a point</span>
        </div>
      ) : (
        <span className="hint">Click a column on the map to remove it</span>
      )}

      <div className="panel-footer">
        <span>{pointCount} points</span>
        <button type="button" className="reset" onClick={onReset}>
          Reset to mock data
        </button>
      </div>
    </div>
  )
}

export default ControlPanel
