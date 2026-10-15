import { useEffect } from "react"
import { Circle, CircleMarker, useMap } from "react-leaflet"
import type { GeoPosition } from "@/hooks/use-geolocation"

interface UserLocationProps {
  active: boolean
  position: GeoPosition | null
}

export default function UserLocation({ active, position }: UserLocationProps) {
  const map = useMap()

  useEffect(() => {
    if (!active || !position) return
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), {
      duration: 0.5,
    })
  }, [active, position, map])

  if (!active || !position) return null

  return (
    <>
      <Circle
        center={[position.lat, position.lng]}
        radius={position.accuracy}
        pathOptions={{
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.1,
          weight: 1,
        }}
      />
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={7}
        pathOptions={{
          color: "#ffffff",
          fillColor: "#2563eb",
          fillOpacity: 1,
          weight: 2,
        }}
      />
    </>
  )
}
