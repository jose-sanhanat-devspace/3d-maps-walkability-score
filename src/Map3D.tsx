import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { PathLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'
import { generateMockWalkabilityData, makeShapeId, type WalkabilityShape } from './walkabilityData'
import ControlPanel, { type EditMode } from './ControlPanel'
import StarRating from './StarRating'

const CITY_CENTER: [number, number] = [100.5231, 13.7367] // Chulalongkorn University, Bangkok, Thailand

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

const DRAFT_COLOR: [number, number, number, number] = [30, 144, 255, 220]
const CLOSE_COLOR: [number, number, number, number] = [46, 204, 113, 255]
const CLOSE_THRESHOLD_PX = 14
const MIN_CLOSE_POINTS = 3

function scoreToColor(score: number, alpha = 220): [number, number, number, number] {
  // 1 star -> pale yellow, 5 stars -> deep red
  const t = Math.max(0, Math.min(1, (score - 1) / 4))
  const r = 255
  const g = Math.round(245 - t * 165)
  const b = Math.round(235 - t * 200)
  return [r, g, b, alpha]
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

  const [shapes, setShapes] = useState<WalkabilityShape[]>(() => generateMockWalkabilityData(CITY_CENTER))
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

  const drawingPathRef = useRef(drawingPath)
  useEffect(() => {
    drawingPathRef.current = drawingPath
  }, [drawingPath])

  const finishLine = () => {
    if (drawingPath && drawingPath.length >= 2) {
      setShapes((prev) => [...prev, { id: makeShapeId(), path: drawingPath, score: scoreRef.current, closed: false }])
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
      const prev = drawingPathRef.current
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      if (prev && prev.length >= MIN_CLOSE_POINTS) {
        const startScreen = map.project(prev[0])
        const dist = Math.hypot(startScreen.x - e.point.x, startScreen.y - e.point.y)
        if (dist <= CLOSE_THRESHOLD_PX) {
          setShapes((s) => [...s, { id: makeShapeId(), path: prev, score: scoreRef.current, closed: true }])
          setDrawingPath(null)
          return
        }
      }

      setDrawingPath(prev ? [...prev, point] : [point])
    })

    return () => {
      map.remove()
      mapRef.current = null
      overlayRef.current = null
    }
  }, [])

  // Keep the deck.gl layers in sync with the current shapes/mode/draft.
  useEffect(() => {
    if (!overlayRef.current) return

    const lines = shapes.filter((s) => !s.closed)
    const areas = shapes.filter((s) => s.closed)
    const canClose = (drawingPath?.length ?? 0) >= MIN_CLOSE_POINTS

    const handleRemoveClick = (info: PickingInfo<WalkabilityShape>) => {
      if (modeRef.current !== 'remove' || !info.object) return
      const target = info.object
      setShapes((prev) => prev.filter((s) => s.id !== target.id))
    }

    const handleHover = (info: PickingInfo<WalkabilityShape>) => {
      setHoverInfo(info.object ? { x: info.x, y: info.y, score: info.object.score } : null)
    }

    overlayRef.current.setProps({
      layers: [
        new PolygonLayer<WalkabilityShape>({
          id: 'walkability-areas',
          data: areas,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 120],
          stroked: true,
          filled: true,
          lineWidthUnits: 'pixels',
          getPolygon: (d) => d.path,
          getFillColor: (d) => scoreToColor(d.score, 110),
          getLineColor: (d) => scoreToColor(d.score),
          getLineWidth: (d) => 2 + d.score * 2,
          onClick: handleRemoveClick,
          onHover: handleHover,
          updateTriggers: {
            getFillColor: mode,
            getLineColor: mode,
          },
        }),
        new PathLayer<WalkabilityShape>({
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
          onClick: handleRemoveClick,
          onHover: handleHover,
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
          getRadius: (_d, { index }) => (canClose && index === 0 ? 9 : 5),
          getFillColor: (_d, { index }) => (canClose && index === 0 ? CLOSE_COLOR : DRAFT_COLOR),
          updateTriggers: {
            getRadius: canClose,
            getFillColor: canClose,
          },
        }),
      ],
    })
  }, [shapes, mode, drawingPath])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div className="legend">
        <h1>Walkability Score</h1>
        <p>Lines & areas — darker red = more walkable</p>
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
        lineCount={shapes.length}
        onReset={() => setShapes(generateMockWalkabilityData(CITY_CENTER))}
        drawingPointCount={drawingPath?.length ?? 0}
        canClose={(drawingPath?.length ?? 0) >= MIN_CLOSE_POINTS}
        onFinishLine={finishLine}
        onCancelLine={cancelLine}
      />
    </div>
  )
}

export default Map3D
