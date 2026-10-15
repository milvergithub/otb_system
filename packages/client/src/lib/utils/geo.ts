export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_METERS = 6371008.8

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function nearestNeighborOrder(
  origin: LatLng,
  points: LatLng[],
): number[] {
  const remaining = points.map((_, index) => index)
  const order: number[] = []
  let current = origin
  while (remaining.length > 0) {
    let bestIndex = 0
    let bestDistance = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const distance = haversineDistance(current, points[remaining[i]])
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }
    const [chosen] = remaining.splice(bestIndex, 1)
    order.push(chosen)
    current = points[chosen]
  }
  return order
}

export function chunkCoordinates<T>(coords: T[], maxPerRequest: number): T[][] {
  if (maxPerRequest < 2) {
    throw new Error("maxPerRequest must be at least 2")
  }
  if (coords.length <= maxPerRequest) {
    return [coords]
  }
  const chunks: T[][] = []
  let start = 0
  while (start < coords.length - 1) {
    const end = Math.min(start + maxPerRequest, coords.length)
    chunks.push(coords.slice(start, end))
    start = end - 1
  }
  return chunks
}

export function nearestPathIndex(
  path: LatLng[],
  point: LatLng,
  from = 0,
): number {
  let best = from
  let bestDistance = Infinity
  for (let i = from; i < path.length; i++) {
    const distance = haversineDistance(path[i], point)
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  }
  return best
}

export function pathSegmentIndices(
  path: LatLng[],
  waypoints: LatLng[],
): number[] {
  if (path.length === 0 || waypoints.length === 0) return []
  const indices: number[] = []
  let from = 0
  for (const waypoint of waypoints) {
    const index = nearestPathIndex(path, waypoint, from)
    indices.push(index)
    from = index
  }
  return indices
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—"
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  const decimals = km < 10 ? 1 : 0
  return `${km.toFixed(decimals)} km`
}
