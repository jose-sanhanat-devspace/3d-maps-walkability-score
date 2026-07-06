import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'
import { generateMockWalkabilityData, makeLineId, type WalkabilityLine } from './walkabilityData'
import ControlPanel, { type EditMode } from './ControlPanel'
import StarRating from './StarRating'

const CITY_CENTER: [number, number] = [100.5231, 13.7367] // Chulalongkorn University, Bangkok, Thailand

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

const DRAFT_COLOR: [number, number, number, number] = [30, 144, 255, 220]

function scoreToColor(score: number): [number, number, number, number] {
  // 1 star -> pale yellow, 5 stars -> deep red
  const t = Math.max(0, Math.min(1, (score - 1) / 4))
  const r = 255
  const g = Math.round(245 - t * 165)
  const b = Math.round(235 - t * 200)
  return [r, g, b, 220]
}

interface HoverInfo {
  x: number
  y: number
  score: number
}

// Real building footprints + heights from OSM, served free by OpenFreeMap.
function addBuildingLayer(map: maplibregl.Map) {
  map.addSource('building-tiles', {
    type: 'vector',
    url: 'https://tiles.openfreemap.org/planet',
    attribution: '© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors',
  })

  map.addLayer({
    id: '3d-buildings',
    source: 'building-tiles',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 13,
    filter: ['!=', ['get', 'hide_3d'], true],
    paint: {
      'fill-extrusion-color': '#c9c9c9',
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, ['get', 'render_height']],
      'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, ['get', 'render_min_height']],
      'fill-extrusion-opacity': 0.85,
    },
  })
}

function Map3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)

  const [lines, setLines] = useState<WalkabilityLine[]>([])
  const [mode, setMode] = useState<EditMode>('add')
  const [score, setScore] = useState(3)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [drawingPath, setDrawingPath] = useState<[number, number][] | null>(null)

  const modeRef = useRef(mode)
  useEffect(() => {
    modeRef.current = mode
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = mode === 'add' ? 'crosshair' : 'pointer'
    }
    if (mode !== 'add') setDrawingPath(null)
  }, [mode])

  const scoreRef = useRef(score)
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  const finishLine = () => {
    if (drawingPath && drawingPath.length >= 2) {
      setLines((prev) => [...prev, { id: makeLineId(), path: drawingPath, score: scoreRef.current }])
    }
    setDrawingPath(null)
  }

  const cancelLine = () => setDrawingPath(null)

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: CITY_CENTER,
      zoom: 15.5,
      pitch: 50,
      bearing: -20,
    })
    mapRef.current = map
    map.getCanvas().style.cursor = 'crosshair'
    map.on('load', () => addBuildingLayer(map))

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] })
    overlayRef.current = overlay
    map.addControl(overlay as unknown as maplibregl.IControl)

    map.on('click', (e) => {
      if (modeRef.current !== 'add') return
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      setDrawingPath((prev) => (prev ? [...prev, point] : [point]))
    })

    return () => {
      map.remove()
      mapRef.current = null
      overlayRef.current = null
    }
  }, [])

  // Keep the deck.gl layers in sync with the current lines/mode/draft.
  useEffect(() => {
    if (!overlayRef.current) return

    overlayRef.current.setProps({
      layers: [
        new PathLayer<WalkabilityLine>({
          id: 'walkability-lines',
          data: lines,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 120],
          widthUnits: 'pixels',
          widthMinPixels: 3,
          getPath: (d) => d.path,
          getWidth: (d) => 2 + d.score * 2,
          getColor: (d) => scoreToColor(d.score),
          onClick: (info: PickingInfo<WalkabilityLine>) => {
            if (modeRef.current !== 'remove' || !info.object) return
            const target = info.object
            setLines((prev) => prev.filter((l) => l.id !== target.id))
          },
          onHover: (info: PickingInfo<WalkabilityLine>) => {
            setHoverInfo(info.object ? { x: info.x, y: info.y, score: info.object.score } : null)
          },
          updateTriggers: {
            getColor: mode,
          },
        }),
        new PathLayer<{ path: [number, number][] }>({
          id: 'draft-line',
          data: drawingPath && drawingPath.length > 1 ? [{ path: drawingPath }] : [],
          widthUnits: 'pixels',
          widthMinPixels: 3,
          getPath: (d) => d.path,
          getWidth: 4,
          getColor: DRAFT_COLOR,
        }),
        new ScatterplotLayer<[number, number]>({
          id: 'draft-vertices',
          data: drawingPath ?? [],
          getPosition: (d) => d,
          radiusUnits: 'pixels',
          getRadius: 5,
          getFillColor: DRAFT_COLOR,
        }),
      ],
    })
  }, [lines, mode, drawingPath])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div className="legend">
        <h1>Walkability Score</h1>
        <p>Lines — thicker & darker red = more walkable</p>
      </div>
      {hoverInfo && (
        <div className="tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
          <StarRating value={hoverInfo.score} size={16} />
        </div>
      )}
      <ControlPanel
        mode={mode}
        onModeChange={setMode}
        score={score}
        onScoreChange={setScore}
        lineCount={lines.length}
        onReset={() => setLines(generateMockWalkabilityData(CITY_CENTER))}
        drawingPointCount={drawingPath?.length ?? 0}
        onFinishLine={finishLine}
        onCancelLine={cancelLine}
      />
    </div>
  )
}

export default Map3D
