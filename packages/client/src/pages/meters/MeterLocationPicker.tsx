import { useEffect, useRef } from "react"
import { MapContainer, Marker, TileLayer, LayersControl, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { DEFAULT_CENTER, markerIcon } from "./constants"

function MapEvents({ onPositionChange }: { onPositionChange: (lat: string, lng: string) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat.toFixed(8), e.latlng.lng.toFixed(8))
    },
  })
  return null
}

function DragMarker({
  position,
  onPositionChange,
}: {
  position: [number, number]
  onPositionChange: (lat: string, lng: string) => void
}) {
  const map = useMap()
  return (
    <Marker
      icon={markerIcon}
      position={position}
      draggable
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng()
          onPositionChange(lat.toFixed(8), lng.toFixed(8))
          map.closePopup()
        },
      }}
    />
  )
}

function FitCenter({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 16)
  }, [center, map])
  return null
}

interface MeterLocationPickerProps {
  latitude?: string
  longitude?: string
  onChange: (lat: string, lng: string) => void
}

export default function MeterLocationPicker({ latitude, longitude, onChange }: MeterLocationPickerProps) {
  const { t } = useTranslation()
  const geoAttempted = useRef(false)

  const hasCoords = latitude !== "" && longitude !== ""
  const center: [number, number] = hasCoords
    ? [parseFloat(latitude!), parseFloat(longitude!)]
    : DEFAULT_CENTER

  useEffect(() => {
    if (geoAttempted.current || hasCoords) return
    geoAttempted.current = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude.toFixed(8), pos.coords.longitude.toFixed(8))
      },
      () => {
        toast.info(t("meters.locationDenied"), { duration: 4000 })
      },
    )
  }, [hasCoords, onChange, t])

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-md border">
      <MapContainer
        key={`${center[0]}-${center[1]}`}
        center={center}
        zoom={16}
        className="h-full w-full"
        zoomControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mapa">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <MapEvents onPositionChange={onChange} />
        {hasCoords && <DragMarker position={center} onPositionChange={onChange} />}
        {hasCoords && <FitCenter center={center} />}
      </MapContainer>
    </div>
  )
}
