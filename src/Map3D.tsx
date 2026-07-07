import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { PathLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers'
import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import type { PickingInfo } from '@deck.gl/core'
import { generateMockWalkabilityData, makeShapeId, type ShapeCategory, type WalkabilityShape } from './walkabilityData'
import { createShape, deleteShape, fetchShapes, resetShapes } from './shapesApi'
import { makeManholeId, type ManholeCover } from './manholeData'
import { createManhole, deleteManhole, fetchManholes, uploadManholeImage } from './manholeApi'
import { pinHeadMesh, pinHeadTranslation, pinStemMesh, PIN_STEM_TRANSLATION } from './pinMesh'
import ControlPanel, { type AssetTab, type EditMode } from './ControlPanel'
import NavigationPanel, { type PickingTarget } from './NavigationPanel'
import StarRating from './StarRating'
import { estimateWalkSeconds, formatDistance, formatDuration, haversineDistanceMeters } from './routeUtils'
import { makeRatingId, type PavementRatingInput } from './ratingData'
import { createRating } from './ratingApi'

const POLL_INTERVAL_MS = 8000

const CITY_CENTER: [number, number] = [100.5231, 13.7367] // Chulalongkorn University, Bangkok, Thailand

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

const DRAFT_COLOR: [number, number, number, number] = [30, 144, 255, 220]
const CLOSE_COLOR: [number, number, number, number] = [46, 204, 113, 255]
const CLOSE_THRESHOLD_PX = 14
const MIN_CLOSE_POINTS = 3
const MANHOLE_COLOR: [number, number, number, number] = [184, 134, 11, 255]
const ROUTE_COLOR: [number, number, number, number] = [0, 122, 255, 220]
const ROUTE_START_COLOR: [number, number, number, number] = [16, 185, 129, 255]
const ROUTE_END_COLOR: [number, number, number, number] = [239, 68, 68, 255]

function walkabilityColor(score: number, alpha = 220): [number, number, number, number] {
  // 1 star -> pale yellow, 5 stars -> deep red
  const t = Math.max(0, Math.min(1, (score - 1) / 4))
  const r = 255
  const g = Math.round(245 - t * 165)
  const b = Math.round(235 - t * 200)
  return [r, g, b, alpha]
}

function priorityColor(score: number, alpha = 220): [number, number, number, number] {
  // 1 star -> pale blue, 5 stars -> deep indigo
  const t = Math.max(0, Math.min(1, (score - 1) / 4))
  const r = Math.round(224 - t * 160)
  const g = Math.round(236 - t * 170)
  const b = 255
  return [r, g, b, alpha]
}

function shapeColor(shape: WalkabilityShape, alpha = 220): [number, number, number, number] {
  return shape.category === 'priority' ? priorityColor(shape.score, alpha) : walkabilityColor(shape.score, alpha)
}

interface HoverInfo {
  x: number
  y: number
  score: number
}

interface ManholeHoverInfo {
  x: number
  y: number
  imageUrl: string | null
  touristSpot: string
}

type AppMode = 'editor' | 'viewer'

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

  const [shapes, setShapes] = useState<WalkabilityShape[]>([])
  const [loaded, setLoaded] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [mode, setMode] = useState<EditMode>('add')
  const [appMode, setAppMode] = useState<AppMode>('editor')
  const [assetTab, setAssetTab] = useState<AssetTab>('walkability')
  const [score, setScore] = useState(3)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [drawingPath, setDrawingPath] = useState<[number, number][] | null>(null)

  const [manholes, setManholes] = useState<ManholeCover[]>([])
  const [manholeMode, setManholeMode] = useState<EditMode>('add')
  const [pendingManholePos, setPendingManholePos] = useState<[number, number] | null>(null)
  const [manholeSaving, setManholeSaving] = useState(false)
  const [manholeHoverInfo, setManholeHoverInfo] = useState<ManholeHoverInfo | null>(null)

  const [pickingTarget, setPickingTarget] = useState<PickingTarget>(null)
  const [routeStart, setRouteStart] = useState<ManholeCover | null>(null)
  const [routeEnd, setRouteEnd] = useState<ManholeCover | null>(null)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [ratingSaving, setRatingSaving] = useState(false)

  const modeRef = useRef(mode)
  const appModeRef = useRef(appMode)
  const assetTabRef = useRef(assetTab)
  const manholeModeRef = useRef(manholeMode)
  const pickingTargetRef = useRef(pickingTarget)
  useEffect(() => {
    modeRef.current = mode
    appModeRef.current = appMode
    assetTabRef.current = assetTab
    manholeModeRef.current = manholeMode
    pickingTargetRef.current = pickingTarget

    if (mapRef.current) {
      let cursor = ''
      if (appMode === 'editor') {
        const activeMode = assetTab === 'manhole' ? manholeMode : mode
        cursor = activeMode === 'add' ? 'crosshair' : 'pointer'
      } else if (pickingTarget) {
        cursor = 'crosshair'
      }
      mapRef.current.getCanvas().style.cursor = cursor
    }

    if (appMode !== 'editor' || assetTab === 'manhole' || mode !== 'add') setDrawingPath(null)
    if (appMode !== 'editor' || assetTab !== 'manhole' || manholeMode !== 'add') setPendingManholePos(null)
    if (appMode !== 'viewer') {
      setPickingTarget(null)
      setShowRatingForm(false)
    }
  }, [mode, appMode, assetTab, manholeMode, pickingTarget])

  // If a pin used in the current route gets deleted, drop the stale reference.
  useEffect(() => {
    if (routeStart && !manholes.some((m) => m.id === routeStart.id)) {
      setRouteStart(null)
      setShowRatingForm(false)
    }
    if (routeEnd && !manholes.some((m) => m.id === routeEnd.id)) {
      setRouteEnd(null)
      setShowRatingForm(false)
    }
  }, [manholes, routeStart, routeEnd])

  const scoreRef = useRef(score)
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  const drawingPathRef = useRef(drawingPath)
  useEffect(() => {
    drawingPathRef.current = drawingPath
  }, [drawingPath])

  // Bumped on every local mutation so a slow/stale fetch (initial load or a
  // poll tick) can't overwrite a newer local change when it resolves late.
  const mutationEpochRef = useRef(0)
  const manholeEpochRef = useRef(0)

  const loadShapes = (markLoaded = false) => {
    const requestEpoch = mutationEpochRef.current
    fetchShapes()
      .then((data) => {
        if (mutationEpochRef.current === requestEpoch) setShapes(data)
      })
      .catch((err) => console.error('Failed to load shapes', err))
      .finally(() => {
        if (markLoaded) setLoaded(true)
      })
  }

  const loadManholes = () => {
    const requestEpoch = manholeEpochRef.current
    fetchManholes()
      .then((data) => {
        if (manholeEpochRef.current === requestEpoch) setManholes(data)
      })
      .catch((err) => console.error('Failed to load manholes', err))
  }

  const finishLine = () => {
    if (drawingPath && drawingPath.length >= 2) {
      const category: ShapeCategory = assetTab === 'priority' ? 'priority' : 'walkability'
      const shape: WalkabilityShape = {
        id: makeShapeId(),
        path: drawingPath,
        score: scoreRef.current,
        closed: false,
        category,
      }
      mutationEpochRef.current += 1
      setShapes((prev) => [...prev, shape])
      createShape(shape).catch((err) => console.error('Failed to save shape', err))
    }
    setDrawingPath(null)
  }

  const cancelLine = () => setDrawingPath(null)

  const saveManhole = async ({ file, touristSpot }: { file: File | null; touristSpot: string }) => {
    if (!pendingManholePos) return
    setManholeSaving(true)
    try {
      const imageUrl = file ? await uploadManholeImage(file) : null
      const manhole: ManholeCover = {
        id: makeManholeId(),
        lng: pendingManholePos[0],
        lat: pendingManholePos[1],
        imageUrl,
        touristSpot,
      }
      manholeEpochRef.current += 1
      setManholes((prev) => [...prev, manhole])
      await createManhole(manhole)
    } catch (err) {
      console.error('Failed to save manhole', err)
    } finally {
      setManholeSaving(false)
      setPendingManholePos(null)
    }
  }

  const cancelManhole = () => setPendingManholePos(null)

  const clearRoute = () => {
    setRouteStart(null)
    setRouteEnd(null)
    setPickingTarget(null)
    setShowRatingForm(false)
  }

  const startRating = () => setShowRatingForm(true)
  const cancelRating = () => setShowRatingForm(false)

  const submitRating = async (data: PavementRatingInput) => {
    if (!routeStart || !routeEnd) return
    setRatingSaving(true)
    try {
      await createRating({
        id: makeRatingId(),
        startPinId: routeStart.id,
        startLng: routeStart.lng,
        startLat: routeStart.lat,
        endPinId: routeEnd.id,
        endLng: routeEnd.lng,
        endLat: routeEnd.lat,
        distanceMeters: routeDistanceMeters ?? 0,
        ...data,
      })
    } catch (err) {
      console.error('Failed to save pavement rating', err)
    } finally {
      setRatingSaving(false)
      clearRoute()
    }
  }

  const routeDistanceMeters =
    routeStart && routeEnd
      ? haversineDistanceMeters([routeStart.lng, routeStart.lat], [routeEnd.lng, routeEnd.lat])
      : null
  const routeDistanceLabel = routeDistanceMeters !== null ? formatDistance(routeDistanceMeters) : null
  const routeDurationLabel =
    routeDistanceMeters !== null ? formatDuration(estimateWalkSeconds(routeDistanceMeters)) : null

  const activeShapeCategory: ShapeCategory = assetTab === 'priority' ? 'priority' : 'walkability'
  const activeShapeCount = shapes.filter((s) => s.category === activeShapeCategory).length

  // Load shared data on mount, then poll so other editors' changes show up.
  useEffect(() => {
    loadShapes(true)
    loadManholes()
    const interval = setInterval(() => {
      loadShapes(false)
      loadManholes()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

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
      if (appModeRef.current !== 'editor') return
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      if (assetTabRef.current === 'manhole') {
        if (manholeModeRef.current !== 'add') return
        setPendingManholePos(point)
        return
      }

      if (modeRef.current !== 'add') return
      const prev = drawingPathRef.current

      if (prev && prev.length >= MIN_CLOSE_POINTS) {
        const startScreen = map.project(prev[0])
        const dist = Math.hypot(startScreen.x - e.point.x, startScreen.y - e.point.y)
        if (dist <= CLOSE_THRESHOLD_PX) {
          const category: ShapeCategory = assetTabRef.current === 'priority' ? 'priority' : 'walkability'
          const shape: WalkabilityShape = {
            id: makeShapeId(),
            path: prev,
            score: scoreRef.current,
            closed: true,
            category,
          }
          mutationEpochRef.current += 1
          setShapes((s) => [...s, shape])
          createShape(shape).catch((err) => console.error('Failed to save shape', err))
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

  // Keep the deck.gl layers in sync with the current shapes/manholes/draft.
  useEffect(() => {
    if (!overlayRef.current) return

    const activeCategory: ShapeCategory | null =
      assetTab === 'priority' ? 'priority' : assetTab === 'walkability' ? 'walkability' : null
    // In editor mode only the active tab's dataset is visible; viewer mode
    // hides all walkability/priority highlights and shows only pins.
    const visibleShapes = appMode === 'editor' ? shapes.filter((s) => s.category === activeCategory) : []
    const lines = visibleShapes.filter((s) => !s.closed)
    const areas = visibleShapes.filter((s) => s.closed)
    const canClose = (drawingPath?.length ?? 0) >= MIN_CLOSE_POINTS

    const handleRemoveClick = (info: PickingInfo<WalkabilityShape>) => {
      if (
        appModeRef.current !== 'editor' ||
        assetTabRef.current === 'manhole' ||
        modeRef.current !== 'remove' ||
        !info.object
      )
        return
      const target = info.object
      mutationEpochRef.current += 1
      setShapes((prev) => prev.filter((s) => s.id !== target.id))
      deleteShape(target.id).catch((err) => console.error('Failed to delete shape', err))
    }

    const handleHover = (info: PickingInfo<WalkabilityShape>) => {
      setHoverInfo(info.object ? { x: info.x, y: info.y, score: info.object.score } : null)
    }

    const handleManholeClick = (info: PickingInfo<ManholeCover>) => {
      if (!info.object) return
      const target = info.object

      if (appModeRef.current === 'editor') {
        if (assetTabRef.current !== 'manhole' || manholeModeRef.current !== 'remove') return
        manholeEpochRef.current += 1
        setManholes((prev) => prev.filter((m) => m.id !== target.id))
        deleteManhole(target.id).catch((err) => console.error('Failed to delete manhole', err))
        return
      }

      if (pickingTargetRef.current === 'start') {
        setRouteStart(target)
        setPickingTarget(null)
      } else if (pickingTargetRef.current === 'end') {
        setRouteEnd(target)
        setPickingTarget(null)
      }
    }

    const handleManholeHover = (info: PickingInfo<ManholeCover>) => {
      setManholeHoverInfo(
        info.object ? { x: info.x, y: info.y, imageUrl: info.object.imageUrl, touristSpot: info.object.touristSpot } : null,
      )
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
          getFillColor: (d) => shapeColor(d, 110),
          getLineColor: (d) => shapeColor(d),
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
          getColor: (d) => shapeColor(d),
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
        new SimpleMeshLayer<ManholeCover>({
          id: 'manhole-stems',
          data: manholes,
          mesh: pinStemMesh,
          getPosition: (d) => [d.lng, d.lat],
          getTranslation: () => PIN_STEM_TRANSLATION,
          getColor: MANHOLE_COLOR,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 120],
          onClick: handleManholeClick,
          onHover: handleManholeHover,
        }),
        new SimpleMeshLayer<ManholeCover>({
          id: 'manhole-heads',
          data: manholes,
          mesh: pinHeadMesh,
          getPosition: (d) => [d.lng, d.lat],
          getTranslation: pinHeadTranslation,
          getColor: MANHOLE_COLOR,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 120],
          onClick: handleManholeClick,
          onHover: handleManholeHover,
        }),
        new ScatterplotLayer<[number, number]>({
          id: 'manhole-draft-marker',
          data: pendingManholePos ? [pendingManholePos] : [],
          getPosition: (d) => d,
          radiusUnits: 'pixels',
          getRadius: 8,
          getFillColor: DRAFT_COLOR,
        }),
        new PathLayer<{ path: [number, number][] }>({
          id: 'route-line',
          data:
            routeStart && routeEnd
              ? [
                  {
                    path: [
                      [routeStart.lng, routeStart.lat],
                      [routeEnd.lng, routeEnd.lat],
                    ],
                  },
                ]
              : [],
          widthUnits: 'pixels',
          widthMinPixels: 4,
          getPath: (d) => d.path,
          getWidth: 4,
          getColor: ROUTE_COLOR,
        }),
        new ScatterplotLayer<{ position: [number, number]; color: [number, number, number, number] }>({
          id: 'route-endpoints',
          data: [
            ...(routeStart ? [{ position: [routeStart.lng, routeStart.lat] as [number, number], color: ROUTE_START_COLOR }] : []),
            ...(routeEnd ? [{ position: [routeEnd.lng, routeEnd.lat] as [number, number], color: ROUTE_END_COLOR }] : []),
          ],
          getPosition: (d) => d.position,
          radiusUnits: 'pixels',
          getRadius: 8,
          getFillColor: (d) => d.color,
        }),
      ],
    })
  }, [shapes, mode, assetTab, appMode, drawingPath, manholes, pendingManholePos, routeStart, routeEnd])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <button type="button" className="ui-toggle" onClick={() => setUiHidden((v) => !v)}>
        {uiHidden ? 'Show UI' : 'Hide UI'}
      </button>
      {!uiHidden && (
        <>
          <div className="legend">
            <h1>Walkability Score</h1>
            <p>
              {appMode === 'editor'
                ? 'Red = walkability, blue = priority — darker means higher score'
                : 'Pins only — set a route below to navigate'}
              {!loaded && ' (loading shared data…)'}
            </p>
            <div className="mode-toggle app-mode-toggle">
              <button
                type="button"
                className={appMode === 'editor' ? 'active' : ''}
                onClick={() => setAppMode('editor')}
              >
                Editor
              </button>
              <button
                type="button"
                className={appMode === 'viewer' ? 'active' : ''}
                onClick={() => setAppMode('viewer')}
              >
                Viewer
              </button>
            </div>
          </div>
          {hoverInfo && (
            <div className="tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
              <StarRating value={hoverInfo.score} size={16} />
            </div>
          )}
          {manholeHoverInfo && (
            <div className="tooltip tooltip-manhole card" style={{ left: manholeHoverInfo.x, top: manholeHoverInfo.y }}>
              <div
                className="header"
                style={manholeHoverInfo.imageUrl ? { backgroundImage: `url(${manholeHoverInfo.imageUrl})` } : undefined}
              >
                {!manholeHoverInfo.imageUrl && '📍'}
              </div>
              <div className="info">
                <p className="title">{manholeHoverInfo.touristSpot || 'No description yet'}</p>
              </div>
              <div className="footer">
                <span className="tag">Art Pin</span>
                <span className="action">View</span>
              </div>
            </div>
          )}
          {appMode === 'editor' ? (
            <ControlPanel
              assetTab={assetTab}
              onAssetTabChange={setAssetTab}
              mode={mode}
              onModeChange={setMode}
              score={score}
              onScoreChange={setScore}
              lineCount={activeShapeCount}
              onReset={() => {
                const mock = generateMockWalkabilityData(CITY_CENTER, activeShapeCategory)
                mutationEpochRef.current += 1
                setShapes((prev) => [...prev.filter((s) => s.category !== activeShapeCategory), ...mock])
                resetShapes(mock, activeShapeCategory).catch((err) => console.error('Failed to reset shapes', err))
              }}
              drawingPointCount={drawingPath?.length ?? 0}
              canClose={(drawingPath?.length ?? 0) >= MIN_CLOSE_POINTS}
              onFinishLine={finishLine}
              onCancelLine={cancelLine}
              manholeMode={manholeMode}
              onManholeModeChange={setManholeMode}
              manholeCount={manholes.length}
              pendingManhole={pendingManholePos !== null}
              manholeSaving={manholeSaving}
              onSaveManhole={saveManhole}
              onCancelManhole={cancelManhole}
            />
          ) : (
            <NavigationPanel
              pickingTarget={pickingTarget}
              onPickingTargetChange={setPickingTarget}
              routeStart={routeStart}
              routeEnd={routeEnd}
              onClear={clearRoute}
              distanceLabel={routeDistanceLabel}
              durationLabel={routeDurationLabel}
              pinCount={manholes.length}
              showRatingForm={showRatingForm}
              onFinish={startRating}
              ratingSaving={ratingSaving}
              onSubmitRating={submitRating}
              onCancelRating={cancelRating}
            />
          )}
        </>
      )}
    </div>
  )
}

export default Map3D
