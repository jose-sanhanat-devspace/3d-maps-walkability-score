import StarRating from './StarRating'
import ManholeForm from './ManholeForm'

export type EditMode = 'add' | 'remove'
export type AssetTab = 'walkability' | 'manhole'

interface ControlPanelProps {
  assetTab: AssetTab
  onAssetTabChange: (tab: AssetTab) => void

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

  manholeMode: EditMode
  onManholeModeChange: (mode: EditMode) => void
  manholeCount: number
  pendingManhole: boolean
  manholeSaving: boolean
  onSaveManhole: (data: { file: File | null; touristSpot: string }) => void
  onCancelManhole: () => void
}

function ControlPanel({
  assetTab,
  onAssetTabChange,
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
  manholeMode,
  onManholeModeChange,
  manholeCount,
  pendingManhole,
  manholeSaving,
  onSaveManhole,
  onCancelManhole,
}: ControlPanelProps) {
  const isDrawing = drawingPointCount > 0

  return (
    <div className="control-panel">
      <div className="asset-tabs">
        <button
          type="button"
          className={assetTab === 'walkability' ? 'active' : ''}
          onClick={() => onAssetTabChange('walkability')}
        >
          Walkability
        </button>
        <button
          type="button"
          className={assetTab === 'manhole' ? 'active' : ''}
          onClick={() => onAssetTabChange('manhole')}
        >
          Manholes
        </button>
      </div>

      {assetTab === 'walkability' ? (
        <>
          <div className="mode-toggle">
            <button type="button" className={mode === 'add' ? 'active' : ''} onClick={() => onModeChange('add')}>
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
              <span className="field-label">Score</span>
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
        </>
      ) : pendingManhole ? (
        <ManholeForm saving={manholeSaving} onSave={onSaveManhole} onCancel={onCancelManhole} />
      ) : (
        <>
          <div className="mode-toggle">
            <button
              type="button"
              className={manholeMode === 'add' ? 'active' : ''}
              onClick={() => onManholeModeChange('add')}
            >
              Add manhole
            </button>
            <button
              type="button"
              className={manholeMode === 'remove' ? 'active' : ''}
              onClick={() => onManholeModeChange('remove')}
            >
              Remove manhole
            </button>
          </div>
          <span className="hint">
            {manholeMode === 'add'
              ? 'Click the map to place an art manhole cover pin'
              : 'Click a pin on the map to remove it'}
          </span>

          <div className="panel-footer">
            <span>{manholeCount} manholes</span>
          </div>
        </>
      )}
    </div>
  )
}

export default ControlPanel
