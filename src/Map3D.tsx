import { useEffect, useMemo, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ColumnLayer } from '@deck.gl/layers'
import { generateMockWalkabilityData, type WalkabilityPoint } from './walkabilityData'

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

function Map3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const data = useMemo<WalkabilityPoint[]>(() => generateMockWalkabilityData(CITY_CENTER), [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: CITY_CENTER,
      zoom: 14,
      pitch: 50,
      bearing: -20,
    })
    mapRef.current = map

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [
        new ColumnLayer<WalkabilityPoint>({
          id: 'walkability-columns',
          data,
          diskResolution: 6,
          radius: 25,
          extruded: true,
          pickable: true,
          elevationScale: 3,
          getPosition: (d) => d.position,
          getElevation: (d) => d.score,
          getFillColor: (d) => scoreToColor(d.score),
        }),
      ],
    })

    map.addControl(overlay as unknown as maplibregl.IControl)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [data])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div className="legend">
        <h1>Walkability Score</h1>
        <p>3D columns — taller & darker red = more walkable</p>
      </div>
    </div>
  )
}

export default Map3D
