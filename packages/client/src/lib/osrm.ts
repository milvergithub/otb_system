import { chunkCoordinates, type LatLng } from "@/lib/utils/geo"

export interface RouteLeg {
  distance: number
  duration: number
}

export interface RouteResult {
  path: LatLng[]
  legs: RouteLeg[]
  distance: number
  duration: number
}

const DEFAULT_OSRM_URL = "https://routing.openstreetmap.de/routed-foot"
const DEFAULT_OSRM_PROFILE = "foot"
const MAX_WAYPOINTS_PER_REQUEST = 20
const REQUEST_INTERVAL_MS = 1100

interface OsrmLeg {
  distance: number
  duration: number
}

interface OsrmRoute {
  distance: number
  duration: number
  legs?: OsrmLeg[]
  geometry?: { coordinates?: [number, number][] }
}

interface OsrmResponse {
  code: string
  message?: string
  routes?: OsrmRoute[]
}

function baseUrl(): string {
  return (
    (import.meta.env.VITE_OSRM_URL as string | undefined) || DEFAULT_OSRM_URL
  )
}

function profile(): string {
  return (
    (import.meta.env.VITE_OSRM_PROFILE as string | undefined) ||
    DEFAULT_OSRM_PROFILE
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Routes through every coordinate in order using the OSRM `route` service.
 * Coordinates are split into connected chunks to respect URL/waypoint limits,
 * concatenating the returned street geometry and per-segment legs.
 */
export async function routeThrough(
  coords: LatLng[],
  maxPerRequest = MAX_WAYPOINTS_PER_REQUEST,
): Promise<RouteResult> {
  if (coords.length < 2) {
    throw new Error("OSRM requires at least two coordinates")
  }

  const chunks = chunkCoordinates(coords, maxPerRequest)
  const path: LatLng[] = []
  const legs: RouteLeg[] = []
  let distance = 0
  let duration = 0

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]
    const coordinates = chunk
      .map((point) => `${point.lng},${point.lat}`)
      .join(";")
    const url = `${baseUrl()}/route/v1/${profile()}/${coordinates}?overview=full&geometries=geojson&steps=false`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`OSRM request failed with status ${response.status}`)
    }
    const data = (await response.json()) as OsrmResponse
    const route = data.routes?.[0]
    if (data.code !== "Ok" || !route) {
      throw new Error(data.message || `OSRM returned ${data.code}`)
    }

    const geometry = (route.geometry?.coordinates ?? []).map(
      ([lng, lat]): LatLng => ({ lat, lng }),
    )
    if (path.length > 0 && geometry.length > 0) {
      geometry.shift()
    }
    path.push(...geometry)

    const chunkLegs = route.legs ?? []
    const usableLegs = index === 0 ? chunkLegs : chunkLegs.slice(1)
    legs.push(
      ...usableLegs.map((leg) => ({
        distance: leg.distance,
        duration: leg.duration,
      })),
    )

    distance += route.distance ?? 0
    duration += route.duration ?? 0

    if (index < chunks.length - 1) {
      await delay(REQUEST_INTERVAL_MS)
    }
  }

  return { path, legs, distance, duration }
}
