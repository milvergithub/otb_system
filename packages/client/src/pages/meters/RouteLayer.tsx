import { useEffect, useMemo } from "react"
import { Marker, Polyline, Tooltip, useMap } from "react-leaflet"
import L from "leaflet"
import type { Meter } from "@/lib/types"
import { pathSegmentIndices, type LatLng } from "@/lib/utils/geo"

interface RouteLayerProps {
  stops: Meter[]
  path: LatLng[]
  activeIndex: number
  visited: Set<string>
  onSelect: (index: number) => void
}

const VISITED_COLOR = "#16a34a"
const PENDING_COLOR = "#2563eb"

function badgeIcon(label: string, state: "visited" | "active" | "pending") {
  const background =
    state === "visited" ? VISITED_COLOR : state === "active" ? PENDING_COLOR : "#1d4ed8"
  const ring =
    state === "active" ? "box-shadow:0 0 0 4px rgba(37,99,235,.35);" : ""
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:${background};color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;border:2px solid #fff;${ring}">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [0, -14],
  })
}

function FlyToStop({ stop }: { stop: Meter | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (!stop?.latitude || !stop.longitude) return
    map.flyTo([parseFloat(stop.latitude), parseFloat(stop.longitude)], 17, {
      duration: 0.6,
    })
  }, [stop, map])
  return null
}

export default function RouteLayer({
  stops,
  path,
  activeIndex,
  visited,
  onSelect,
}: RouteLayerProps) {
  const segments = useMemo(() => {
    if (path.length < 2) return []
    const usable = stops.filter((stop) => stop.latitude && stop.longitude)
    if (usable.length === 0) return []
    const waypoints: LatLng[] = [
      path[0],
      ...usable.map(
        (stop): LatLng => ({
          lat: parseFloat(stop.latitude!),
          lng: parseFloat(stop.longitude!),
        }),
      ),
    ]
    const indices = pathSegmentIndices(path, waypoints)
    return usable
      .map((stop, index) => ({
        id: stop.id,
        positions: path
          .slice(indices[index], indices[index + 1] + 1)
          .map((point) => [point.lat, point.lng] as [number, number]),
      }))
      .filter((segment) => segment.positions.length > 1)
  }, [stops, path])

  return (
    <>
      {segments.map((segment) => (
        <Polyline
          key={segment.id}
          positions={segment.positions}
          pathOptions={{
            color: visited.has(segment.id) ? VISITED_COLOR : PENDING_COLOR,
            weight: 5,
            opacity: 0.85,
          }}
        />
      ))}
      {stops.map((stop, index) => {
        if (!stop.latitude || !stop.longitude) return null
        const state = visited.has(stop.id)
          ? "visited"
          : index === activeIndex
            ? "active"
            : "pending"
        return (
          <Marker
            key={stop.id}
            position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
            icon={badgeIcon(String(index + 1), state)}
            eventHandlers={{ click: () => onSelect(index) }}
          >
            <Tooltip direction="top">
              <span className="font-mono font-semibold">{stop.code}</span>
              {stop.address ? <span> · {stop.address}</span> : null}
            </Tooltip>
          </Marker>
        )
      })}
      <FlyToStop stop={stops[activeIndex]} />
    </>
  )
}
