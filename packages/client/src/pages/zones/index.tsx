import { useEffect, useRef, useState, type MutableRefObject } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Trash2 } from "lucide-react"
import { GeoJSON, LayersControl, MapContainer, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"
import "@geoman-io/leaflet-geoman-free"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ComboboxSelect } from "@/components/ui/combobox"
import { Skeleton } from "@/components/ui/skeleton"
import { useZones, useCreateZone, useUpdateZone, useDeleteZone } from "@/hooks/zones"
import { useZoneTypes } from "@/hooks/zoneTypes"
import type { Zone, ZoneTypeItem } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import Can from "@/components/Can"

const ZONE_DEFAULT_CENTER: [number, number] = [-17.361816, -66.243875]

const PRESET_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
]

function DrawControl({
  zones,
  layerIdMapRef,
  onCreated,
  onEdited,
  onDeleted,
  canCreate,
  canUpdate,
  canDelete,
}: {
  zones: Zone[]
  layerIdMapRef: MutableRefObject<Map<L.Layer, string>>
  onCreated: (geojson: Record<string, unknown>) => void
  onEdited: (id: string, geojson: Record<string, unknown>) => void
  onDeleted: (id: string) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}) {
  const map = useMap()
  const initRef = useRef(false)
  const draftLayersRef = useRef<L.Layer[]>([])
  const seenZoneIdsRef = useRef<Set<string>>(new Set())
  const onCreatedRef = useRef(onCreated)
  const onEditedRef = useRef(onEdited)
  const onDeletedRef = useRef(onDeleted)

  useEffect(() => {
    onCreatedRef.current = onCreated
    onEditedRef.current = onEdited
    onDeletedRef.current = onDeleted
  })

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    map.pm.setGlobalOptions({
      allowSelfIntersection: false,
      snappable: true,
      pathOptions: { color: "#3b82f6", weight: 3, fillOpacity: 0.2 },
    })

    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawCircle: false,
      drawRectangle: canCreate,
      drawPolyline: canCreate,
      drawPolygon: canCreate,
      drawText: false,
      cutPolygon: false,
      editMode: canUpdate,
      dragMode: canUpdate,
      removalMode: canDelete,
      rotateMode: false,
    })

    const handleCreate = (e: { shape: string; layer: L.Layer }) => {
      draftLayersRef.current.push(e.layer)
      const geojson = (e.layer as any).toGeoJSON() as Record<string, unknown>
      onCreatedRef.current(geojson)
    }

    const handleUpdate = (e: { layer: L.Layer }) => {
      const zoneId = layerIdMapRef.current.get(e.layer)
      if (zoneId) {
        const geojson = (e.layer as any).toGeoJSON() as Record<string, unknown>
        onEditedRef.current(zoneId, geojson)
      }
    }

    const handleRemove = (e: { layer: L.Layer }) => {
      const zoneId = layerIdMapRef.current.get(e.layer)
      if (zoneId) {
        layerIdMapRef.current.delete(e.layer)
        onDeletedRef.current(zoneId)
      } else {
        const draftIndex = draftLayersRef.current.indexOf(e.layer)
        if (draftIndex >= 0) {
          draftLayersRef.current.splice(draftIndex, 1)
        }
      }
    }

    map.on("pm:create", handleCreate)
    map.on("pm:update", handleUpdate)
    map.on("pm:remove", handleRemove)

    return () => {
      map.off("pm:create", handleCreate)
      map.off("pm:update", handleUpdate)
      map.off("pm:remove", handleRemove)
      map.pm.disableDraw()
      map.pm.removeControls()
      draftLayersRef.current.forEach((layer) => layer.remove())
      draftLayersRef.current = []
      initRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const currentIds = new Set(zones.map((z) => z.id))
    let addedNew = false
    for (const id of currentIds) {
      if (!seenZoneIdsRef.current.has(id)) {
        addedNew = true
        break
      }
    }
    seenZoneIdsRef.current = currentIds

    if (addedNew && draftLayersRef.current.length > 0) {
      draftLayersRef.current.forEach((layer) => layer.remove())
      draftLayersRef.current = []
    }
  }, [zones])

  return null
}

function ZoneOverlay({
  zone,
  layerIdMapRef,
}: {
  zone: Zone
  layerIdMapRef: MutableRefObject<Map<L.Layer, string>>
}) {
  useEffect(() => {
    const mapRef = layerIdMapRef.current
    return () => {
      for (const [layer, id] of mapRef) {
        if (id === zone.id) {
          mapRef.delete(layer)
        }
      }
    }
  }, [zone.id, layerIdMapRef])

  return (
    <LayersControl.Overlay name={zone.name} checked>
      <GeoJSON
        key={zone.id}
        data={zone.geometry as unknown as GeoJSON.GeoJsonObject}
        style={{
          color: zone.color || "#3b82f6",
          weight: zone.line_width ?? 3,
          opacity: 0.8,
          fillOpacity: 0.2,
        }}
        onEachFeature={(_feature, layer) => {
          layer.bindTooltip(zone.name, { sticky: true })
          layerIdMapRef.current.set(layer, zone.id)
        }}
      />
    </LayersControl.Overlay>
  )
}

export default function ZonesPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canRead = hasPermission("zones.read")
  const canCreate = hasPermission("zones.create")
  const canUpdate = hasPermission("zones.update")
  const canDelete = hasPermission("zones.delete")

  const { data, isLoading } = useZones()
  const zones = Array.isArray(data) ? data : []
  const layerIdMapRef = useRef<Map<L.Layer, string>>(new Map())
  const { data: zoneTypes } = useZoneTypes()
  const createZone = useCreateZone()
  const updateZone = useUpdateZone()
  const deleteZone = useDeleteZone()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [pendingGeojson, setPendingGeojson] = useState<Record<string, unknown> | null>(null)
  const [name, setName] = useState("")
  const [zoneTypeId, setZoneTypeId] = useState<string>("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [lineWidth, setLineWidth] = useState(3)
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null)

  function handleCreated(geojson: Record<string, unknown>) {
    if (!canCreate) return
    setPendingGeojson(geojson)
    setEditingZone(null)
    setName("")
    setZoneTypeId("")
    setColor(PRESET_COLORS[0])
    setLineWidth(3)
    setDialogOpen(true)
  }

  function handleEdited(id: string, geojson: Record<string, unknown>) {
    if (!canUpdate) return
    updateZone.mutate({ id, geometry: geojson })
  }

  function handleDeleted(id: string) {
    if (!canDelete) return
    deleteZone.mutate(id)
  }

  function handleZoneTypeChange(typeId: string | null) {
    setZoneTypeId(typeId ?? "")
    const zt = zoneTypes?.find((z) => z.id === typeId)
    if (zt) {
      setColor(zt.default_color)
      setLineWidth(zt.default_line_width)
    }
  }

  function handleSave() {
    if (!pendingGeojson || !name.trim()) return

    const payload = {
      name,
      zone_type_id: zoneTypeId || undefined,
      color,
      line_width: lineWidth,
      geometry: pendingGeojson,
    }

    if (editingZone) {
      updateZone.mutate(
        { id: editingZone.id, ...payload },
        { onSuccess: () => { setDialogOpen(false); setPendingGeojson(null) } },
      )
    } else {
      createZone.mutate(
        payload,
        { onSuccess: () => { setDialogOpen(false); setPendingGeojson(null) } },
      )
    }
  }

  function handleEditZone(zone: Zone) {
    if (!canUpdate) return
    setEditingZone(zone)
    setPendingGeojson(zone.geometry)
    setName(zone.name)
    setZoneTypeId(zone.zone_type_id || "")
    setColor(zone.color || PRESET_COLORS[0])
    setLineWidth(zone.line_width ?? 3)
    setDialogOpen(true)
  }

  function handleConfirmDelete() {
    if (!deleteTarget || !canDelete) return
    deleteZone.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (!canRead) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("common.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="flex lg:flex-row sm:flex-col h-[calc(100dvh-8rem)] gap-4">
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 p-0 min-h-0 h-[calc(100dvh-3rem)]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <MapContainer
              center={ZONE_DEFAULT_CENTER}
              zoom={16}
              className="h-full w-full"
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

                {zones.map((zone) => (
                  <ZoneOverlay
                    key={zone.id}
                    zone={zone}
                    layerIdMapRef={layerIdMapRef}
                  />
                ))}
              </LayersControl>
              <DrawControl
                zones={zones}
                layerIdMapRef={layerIdMapRef}
                onCreated={handleCreated}
                onEdited={handleEdited}
                onDeleted={handleDeleted}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
              />
            </MapContainer>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardContent className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("zones.empty", "Dibuja una zona en el mapa para comenzar")}
            </p>
          ) : (
            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center gap-2 p-2 rounded-md border hover:bg-accent/50"
                >
                  <div
                    className="h-4 w-4 rounded-sm shrink-0 border"
                    style={{ backgroundColor: zone.color || "#3b82f6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{zone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {zone.zoneType?.name || zone.type}
                      <span className="ml-1 opacity-60">| {zone.line_width ?? 3}px</span>
                    </p>
                  </div>
                  <Can permission="zones.update">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditZone(zone)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Can>
                  <Can permission="zones.delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteTarget(zone)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </Can>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingZone
                ? t("zones.edit", "Editar zona")
                : t("zones.new", "Nueva zona")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("zones.name", "Nombre")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("zones.namePlaceholder", "Ej: Zona Norte")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("zones.type", "Tipo")}</Label>
              <ComboboxSelect
                  value={zoneTypeId}
                  onValueChange={handleZoneTypeChange}
                  placeholder={t("zones.selectType", "Seleccionar tipo...")}
                  className="w-full"
                  options={(zoneTypes?.map((zt) => ({ label: zt.name, value: zt.id })) ?? [])}
                />
            </div>
            <div className="space-y-2">
              <Label>{t("zones.color", "Color")}</Label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border shrink-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("zones.lineWidth", "Ancho de línea")}: {lineWidth}px</Label>
              <input
                type="range"
                min={1}
                max={10}
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1px</span>
                <span>10px</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel", "Cancelar")}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {t("common.save", "Guardar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("zones.deleteTitle", "Eliminar zona")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "zones.deleteDescription",
                "¿Estás seguro de que quieres eliminar la zona \"{{name}}\"?",
              ).replace("{{name}}", deleteTarget?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              {t("common.delete", "Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
