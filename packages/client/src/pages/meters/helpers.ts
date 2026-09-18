import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import type { Meter, ShareStatus, Zone } from "@/lib/types"
import { useMembersSelect } from "@/hooks/members"

export function shareStatusOf(meter: Meter): ShareStatus {
  const paid = meter.sharePaid ?? 0
  const total = meter.shareTotal ?? 0
  if (paid <= 0) return "pending"
  if (total > 0 && paid < total) return "partial"
  return "paid"
}

export function hasCoords(m: Meter): boolean {
  return !!m.latitude && !!m.longitude
}

export function useMemberName() {
  const { data: members } = useMembersSelect()
  return (id: string) => {
    const m = members?.items.find((x) => x.id === id)
    return m ? `${m.first_name} ${m.last_name}` : id.slice(0, 8)
  }
}

export function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 })
  }, [map, points])
  return null
}

export function zoneBoundsPoints(zones: Zone[]): [number, number][] {
  const points: [number, number][] = []
  for (const zone of zones) {
    const root = zone.geometry as {
      type?: string
      geometry?: { coordinates?: unknown }
      coordinates?: unknown
    }
    if (!root) continue
    const geom =
      root.type === "Feature"
        ? (root.geometry as { coordinates?: unknown })
        : root
    if (!geom) continue
    const coords = geom.coordinates
    if (!Array.isArray(coords)) continue
    const flat = coords.flat(Infinity) as number[]
    for (let i = 0; i + 1 < flat.length; i += 2) {
      points.push([flat[i + 1], flat[i]])
    }
  }
  return points
}
