import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ColumnLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'
import { generateMockWalkabilityData, makePointId, type WalkabilityPoint } from './walkabilityData'
import ControlPanel, { type EditMode } from './ControlPanel'

const CITY_CENTER: [number, number] = [100.5231, 13.7367] // Chulalongkorn University, Bangkok, Thailand

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

function scoreToColor(score: number): [number, number, number, number] {
  // low score -> pale yellow, high score -> deep red
  const t = Math.max(0, Math.min(1, score / 100))
  const r = 255
  const g = Math.round(245 - t * 165)
  const b = Math.round(235 - t * 200)
  return [r, g, b, 200]
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

  const [points, setPoints] = useState<WalkabilityPoint[]>([])
  const [mode, setMode] = useState<EditMode>('add')
  const [score, setScore] = useState(70)

  const modeRef = useRef(mode)
  useEffect(() => {
    modeRef.current = mode
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = mode === 'add' ? 'crosshair' : 'pointer'
    }
  }, [mode])

  const scoreRef = useRef(score)
  useEffect(() => {
    scoreRef.current = score
  }, [score])

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
      const { lng, lat } = e.lngLat
      setPoints((prev) => [...prev, { id: makePointId(), position: [lng, lat], score: scoreRef.current }])
    })

    return () => {
      map.remove()
      mapRef.current = null
      overlayRef.current = null
    }
  }, [])

  // Keep the deck.gl layer in sync with the current points/mode.
  useEffect(() => {
    if (!overlayRef.current) return

    overlayRef.current.setProps({
      layers: [
        new ColumnLayer<WalkabilityPoint>({
          id: 'walkability-columns',
          data: points,
          diskResolution: 6,
          radius: 25,
          extruded: true,
          pickable: true,
          autoHighlight: mode === 'remove',
          elevationScale: 3,
          getPosition: (d) => d.position,
          getElevation: (d) => d.score,
          getFillColor: (d) => scoreToColor(d.score),
          onClick: (info: PickingInfo<WalkabilityPoint>) => {
            if (modeRef.current !== 'remove' || !info.object) return
            const target = info.object
            setPoints((prev) => prev.filter((p) => p.id !== target.id))
          },
          updateTriggers: {
            getFillColor: mode,
          },
        }),
      ],
    })
  }, [points, mode])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div className="legend">
        <h1>Walkability Score</h1>
        <p>3D columns — taller & darker red = more walkable</p>
      </div>
      <ControlPanel
        mode={mode}
        onModeChange={setMode}
        score={score}
        onScoreChange={setScore}
        pointCount={points.length}
        onReset={() => setPoints(generateMockWalkabilityData(CITY_CENTER, 400, 0.015))}
      />
    </div>
  )
}

export default Map3D
