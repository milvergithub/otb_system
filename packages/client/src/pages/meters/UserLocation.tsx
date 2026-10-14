import { useEffect, useRef, useState } from "react"
import { Circle, CircleMarker, useMap } from "react-leaflet"

interface UserLocationProps {
  active: boolean
  onError: () => void
}

interface UserPosition {
  lat: number
  lng: number
  accuracy: number
}

export default function UserLocation({ active, onError }: UserLocationProps) {
  const map = useMap()
  const [pos, setPos] = useState<UserPosition | null>(null)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  })

  useEffect(() => {
    if (!active) return
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const next: UserPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setPos(next)
        map.flyTo([next.lat, next.lng], Math.max(map.getZoom(), 16), {
          duration: 0.5,
        })
      },
      () => onErrorRef.current(),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )
    return () => {
      navigator.geolocation.clearWatch(id)
    }
  }, [active, map])

  if (!active || !pos) return null

  return (
    <>
      <Circle
        center={[pos.lat, pos.lng]}
        radius={pos.accuracy}
        pathOptions={{
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.1,
          weight: 1,
        }}
      />
      <CircleMarker
        center={[pos.lat, pos.lng]}
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
