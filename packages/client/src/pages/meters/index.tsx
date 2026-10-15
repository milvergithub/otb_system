import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ExternalLink,
  HandCoins,
  List,
  LocateFixed,
  Map,
  MapPin,
  Pencil,
  Plus,
  Route,
  Search,
  Trash2,
} from "lucide-react"
import { MapContainer, Marker, Popup, GeoJSON, TileLayer, LayersControl } from "react-leaflet"
import { toast } from "sonner"
import type { Meter } from "@/lib/types"
import { formatCurrency, formatDate, getWhatsAppUrl, googleMapsUrl } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { useSearchMeters, useMeterMap } from "@/hooks/meters"
import { useMeterTypes } from "@/hooks/meterTypes"
import { useZones } from "@/hooks/zones"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { ComboboxSelect } from "@/components/ui/combobox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import Can from "@/components/Can"
import { STATUS_LABEL, SHARE_STATUS_LABEL, DEFAULT_CENTER, markerIcon } from "./constants"
import { FitBounds, shareStatusOf, hasCoords, useMemberName, zoneBoundsPoints } from "./helpers"
import UserLocation from "./UserLocation"
import RouteLayer from "./RouteLayer"
import MetersRoutePanel from "./MetersRoutePanel"
import { useGeolocation, type GeoPosition } from "@/hooks/use-geolocation"
import { routeThrough, type RouteLeg } from "@/lib/osrm"
import { nearestNeighborOrder, type LatLng } from "@/lib/utils/geo"
import MeterFormDialog from "./MeterFormDialog"
import SharePaymentsDialog from "./SharePaymentsDialog"
import MeterDetailSheet from "./MeterDetailSheet"
import DeleteMeterDialog from "./DeleteMeterDialog"
import logoMap from "@/assets/map.svg"

export default function MetersPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearch = useDebounce(searchInput.trim(), 300)
  const [search, setSearch] = useState(debouncedSearch)
  if (search !== debouncedSearch) {
    setSearch(debouncedSearch)
    setPage(1)
  }
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Meter | null>(null)
  const [deleting, setDeleting] = useState<Meter | null>(null)
  const [shareMeter, setShareMeter] = useState<Meter | null>(null)
  const [viewing, setViewing] = useState<Meter | null>(null)
  const [locating, setLocating] = useState(false)

  const [routeActive, setRouteActive] = useState(false)
  const [routeStops, setRouteStops] = useState<Meter[]>([])
  const [routeLegs, setRouteLegs] = useState<RouteLeg[]>([])
  const [routePath, setRoutePath] = useState<LatLng[]>([])
  const [routeIndex, setRouteIndex] = useState(0)
  const [visited, setVisited] = useState<Set<string>>(new Set())
  const [routeLoading, setRouteLoading] = useState(false)
  const awaitingRouteRef = useRef(false)

  const { sort, toggleSort } = useTableSort(
    { key: "created_at", order: "desc" },
    () => setPage(1),
  )

  const { data, isLoading } = useSearchMeters({
    page,
    search,
    status: statusFilter as "" | "active" | "inactive" | "decommissioned",
    type: typeFilter,
    sortBy: sort?.key,
    sortOrder: sort?.order,
  })

  const { data: mapMeters } = useMeterMap()

  const { data: meterTypes } = useMeterTypes()

  const { data: zones } = useZones()

  const memberName = useMemberName()

  const fitPoints = useMemo<[number, number][]>(
    () => [
      ...(mapMeters || [])
        .filter((m) => m.latitude && m.longitude)
        .map((m) => [parseFloat(m.latitude!), parseFloat(m.longitude!)] as [number, number]),
      ...zoneBoundsPoints(zones || []),
    ],
    [mapMeters, zones],
  )

  const visibleMapMeters = routeActive ? [] : mapMeters

  const computeRoute = useCallback(
    async (origin: GeoPosition) => {
      const meters = (mapMeters ?? []).filter((m) => m.latitude && m.longitude)
      if (meters.length === 0) {
        toast.info(t("meters.route.noMeters"))
        setRouteActive(false)
        setRouteLoading(false)
        return
      }
      setRouteActive(true)
      setRouteLoading(true)
      setVisited(new Set())
      setRouteIndex(0)
      try {
        const originPoint: LatLng = { lat: origin.lat, lng: origin.lng }
        const points = meters.map(
          (m): LatLng => ({ lat: parseFloat(m.latitude!), lng: parseFloat(m.longitude!) }),
        )
        const order = nearestNeighborOrder(originPoint, points)
        const coordinates: LatLng[] = [originPoint, ...order.map((i) => points[i])]
        const result = await routeThrough(coordinates)
        setRouteStops(order.map((i) => meters[i]))
        setRouteLegs(result.legs)
        setRoutePath(result.path)
      } catch {
        toast.error(t("meters.route.error"))
        setRouteActive(false)
      } finally {
        setRouteLoading(false)
      }
    },
    [mapMeters, t],
  )

  const { position, supported, start: startGeo, stop: stopGeo } = useGeolocation({
    onError: () => {
      toast.error(t("meters.locationDenied"))
      setLocating(false)
      setRouteActive(false)
    },
    onPosition: (pos) => {
      if (awaitingRouteRef.current) {
        awaitingRouteRef.current = false
        void computeRoute(pos)
      }
    },
  })

  const startRoute = () => {
    if (!supported) {
      toast.error(t("meters.locationDenied"))
      return
    }
    if (position) {
      void computeRoute(position)
      return
    }
    toast.info(t("meters.route.gettingLocation"))
    awaitingRouteRef.current = true
    setRouteActive(true)
    setRouteLoading(true)
  }

  const closeRoute = () => {
    awaitingRouteRef.current = false
    setRouteActive(false)
    setRouteLoading(false)
    setRouteStops([])
    setRouteLegs([])
    setRoutePath([])
    setVisited(new Set())
    setRouteIndex(0)
  }

  const toggleVisited = (id: string) => {
    setVisited((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleNext = () => {
    if (routeStops.length === 0) return
    for (let step = 1; step <= routeStops.length; step++) {
      const index = (routeIndex + step) % routeStops.length
      if (!visited.has(routeStops[index].id)) {
        setRouteIndex(index)
        return
      }
    }
    toast.success(t("meters.route.completed"))
  }

  useEffect(() => {
    if (locating || routeActive) startGeo()
    else stopGeo()
  }, [locating, routeActive, startGeo, stopGeo])

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(meter: Meter) {
    setEditing(meter)
    setDialogOpen(true)
  }

  function openSharePayments(meter: Meter) {
    setViewing(null)
    setShareMeter(meter)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("meters.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("meters.subtitle")}
          </p>
        </div>
        <Can permission="meters.create">
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("meters.newMeter")}
          </Button>
        </Can>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            <List className="mr-2 size-4" />
            {t("meters.list")}
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="mr-2 size-4" />
            {t("meters.map")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por código, socio o CI..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <ComboboxSelect
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(1) }}
              placeholder={t("meters.status")}
              className="w-40"
              options={[
                { label: t("meters.allStatuses"), value: "" },
                ...Object.entries(STATUS_LABEL).map(([k, v]) => ({ label: t(v), value: k })),
              ]}
            />
            <ComboboxSelect
              value={typeFilter}
              onValueChange={(v) => { setTypeFilter(v); setPage(1) }}
              placeholder={t("meters.type")}
              className="w-40"
              options={[
                { label: t("meters.allTypes"), value: "" },
                ...(meterTypes?.map((mt) => ({ label: mt.name, value: mt.id })) ?? []),
              ]}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <DataTable<Meter>
                columns={[
                  {
                    key: "details",
                    label: t("meters.details"),
                    render: (meter) => (
                      <div onClick={() => setViewing(meter)} className="border border-border w-32 rounded-sm cursor-pointer">
                        <img src={logoMap} alt={t("meters.map")} className="w-32" />
                      </div>
                    ),
                  },
                  { key: "code", label: t("meters.code"), sortable: true, render: (meter) => <span className="font-mono font-medium">{meter.code}</span> },
                  { key: "member", label: t("meters.member"), sortable: true, render: (meter) => <span>{memberName(meter.member_id)}</span> },
                  { key: "type", label: t("meters.type"), sortable: true, render: (meter) => <Badge variant="outline">{meter.type?.name ?? "—"}</Badge> },
                  {
                    key: "share",
                    label: t("meters.share"),
                    render: (meter) => {
                      const shareStatus = shareStatusOf(meter)
                      const shareVariant = shareStatus === "paid" ? "default" : shareStatus === "partial" ? "secondary" : "outline"
                      return (
                        <div>
                          {hasPermission("meters.update") ? (
                            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShareMeter(meter)}>
                              <Badge variant={shareVariant}>{t(SHARE_STATUS_LABEL[shareStatus])}</Badge>
                            </Button>
                          ) : (
                            <Badge variant={shareVariant}>{t(SHARE_STATUS_LABEL[shareStatus])}</Badge>
                          )}
                          {(meter.sharePaid ?? 0) > 0 ? <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(meter.sharePaid ?? 0)}{meter.shareTotal ? ` / ${formatCurrency(meter.shareTotal)}` : ""}</p> : null}
                        </div>
                      )
                    },
                  },
                  {
                    key: "address",
                    label: t("meters.address"),
                    sortable: true,
                    render: (meter) => (
                      <div className="max-w-[200px] truncate">
                        <div>{meter.address}</div>
                        {hasCoords(meter) ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs">{parseFloat(meter.latitude!).toFixed(4)}, {parseFloat(meter.longitude!).toFixed(4)}</span>
                            <a href={googleMapsUrl(meter.latitude!, meter.longitude!)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"><ExternalLink className="size-3" />{t("meters.googleMaps")}</a>
                          </div>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    label: t("meters.status"),
                    sortable: true,
                    render: (meter) => (
                      <Badge
                        variant={meter.status === "active" ? "default" : meter.status === "decommissioned" ? "destructive" : "secondary"}
                      >
                        {t(STATUS_LABEL[meter.status])}
                      </Badge>
                    ),
                  },
                  {
                    key: "actions",
                    label: "",
                    className: "w-10",
                    stickyRight: true,
                    render: (meter) => (
                      <RowActions
                        items={[
                          {
                              label: t("common.edit"),
                              icon: <Pencil className="size-4" />,
                              permission: "meters.update",
                              onClick: () => openEdit(meter)
                          },
                          {
                              label: t("meters.sharePaymentsTitle"),
                              icon: <HandCoins className="size-4" />,
                              permission: "meters.sharePayments",
                              onClick: () => setShareMeter(meter)
                          },
                          {
                              label: t("common.delete"),
                              icon: <Trash2 className="size-4" />,
                              permission: "meters.delete",
                              destructive: true, onClick: () => setDeleting(meter)
                          },
                        ]}
                      />
                    ),
                  },
                ]}
                data={data?.items ?? []}
                sort={sort}
                onSort={toggleSort}
                isLoading={isLoading}
                emptyIcon={<MapPin className="size-6 text-muted-foreground" />}
                emptyText={t("meters.empty")}
                rowKey={(meter) => meter.id}
              />
            </CardContent>
          </Card>

          {data ? <DataTablePagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} noun={t("meters.noun")} /> : null}
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardContent className="p-0">
              <div className="relative h-[calc(100dvh-13rem)] w-full">
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={1}
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
                    </LayersControl>
                  <FitBounds points={fitPoints} />
                  {(zones || []).map((zone) => (
                    <GeoJSON
                      key={zone.id}
                      data={zone.geometry as unknown as GeoJSON.GeoJsonObject}
                      style={{
                        color: zone.color || "#3b82f6",
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.2,
                      }}
                      onEachFeature={(feature, layer) => {
                        layer.bindTooltip(zone.name, { sticky: true })
                      }}
                    />
                  ))}
                  {visibleMapMeters?.map(
                    (meter) =>
                      meter.latitude &&
                      meter.longitude && (
                        <Marker
                          key={meter.id}
                          icon={markerIcon}
                          position={[
                            parseFloat(meter.latitude),
                            parseFloat(meter.longitude),
                          ]}
                        >
                          <Popup>
                            <div className="w-64 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-mono text-sm font-semibold">
                                  {meter.code}
                                </p>
                                <Badge
                                  variant={
                                    meter.status === "active"
                                      ? "default"
                                      : meter.status === "decommissioned"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {t(STATUS_LABEL[meter.status])}
                                </Badge>
                              </div>
                              <Badge variant="outline">
                                {meter.type?.name ?? "—"}
                              </Badge>
                              <div className="space-y-1 border-t pt-2 text-xs">
                                <p className="font-semibold text-muted-foreground">
                                  {t("meters.member")}
                                </p>
                                <dl className="space-y-0.5">
                                  <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">{t("meters.name")}</dt>
                                    <dd className="text-right font-medium">
                                      {meter.member?.first_name}{" "}
                                      {meter.member?.last_name}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">{t("meters.ci")}</dt>
                                    <dd className="text-right font-medium">
                                      {meter.member?.ci ?? "—"}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">{t("meters.phone")}</dt>
                                    <dd className="text-right font-medium">
                                      {meter.member?.phone ? (
                                        <a
                                          href={getWhatsAppUrl(meter.member.phone, meter.member.phone_country ?? "BO") ?? "#"}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Abrir en WhatsApp"
                                          className="inline-flex items-center gap-1 text-primary hover:underline"
                                        >
                                          {meter.member.phone}
                                          <ExternalLink className="size-3" />
                                        </a>
                                      ) : (
                                        "\u2014"
                                      )}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                              <div className="space-y-1 border-t pt-2 text-xs">
                                <p className="font-semibold text-muted-foreground">
                                  {t("meters.meter")}
                                </p>
                                <dl className="space-y-0.5">
                                  <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">
                                      {t("meters.address")}
                                    </dt>
                                    <dd className="text-right font-medium">
                                      {meter.address}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">
                                      {t("meters.installed")}
                                    </dt>
                                    <dd className="text-right font-medium">
                                      {formatDate(meter.installed_at)}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                              <a
                                href={googleMapsUrl(meter.latitude, meter.longitude)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
                              >
                                <ExternalLink className="size-3" />
                                {t("meters.openInGoogleMaps")}
                              </a>
                            </div>
                          </Popup>
                        </Marker>
                      ),
                  )}
                  <UserLocation active={locating || routeActive} position={position} />
                  {routeActive && (
                    <RouteLayer
                      stops={routeStops}
                      path={routePath}
                      activeIndex={routeIndex}
                      visited={visited}
                      onSelect={setRouteIndex}
                    />
                  )}
                </MapContainer>
                <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={routeActive ? "default" : "outline"}
                    className="shadow"
                    title={t("meters.route.start")}
                    aria-label={t("meters.route.start")}
                    aria-pressed={routeActive}
                    onClick={routeActive ? closeRoute : startRoute}
                  >
                    <Route />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant={locating ? "default" : "outline"}
                    className="shadow"
                    title={t("meters.useMyLocation")}
                    aria-label={t("meters.useMyLocation")}
                    aria-pressed={locating}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error(t("meters.locationDenied"))
                        return
                      }
                      setLocating((value) => !value)
                    }}
                  >
                    <LocateFixed className={locating ? "animate-pulse" : undefined} />
                  </Button>
                </div>
                {mapMeters &&
                !mapMeters.some((m) => m.latitude && m.longitude) ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="rounded-md bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow">
                      {t("meters.noMetersWithLocation")}
                    </p>
                  </div>
                ) : null}
                {routeActive && (
                  <MetersRoutePanel
                    stops={routeStops}
                    legs={routeLegs}
                    activeIndex={routeIndex}
                    visited={visited}
                    loading={routeLoading}
                    totalDistance={routeLegs.reduce((sum, leg) => sum + leg.distance, 0)}
                    onSelect={setRouteIndex}
                    onToggleVisited={toggleVisited}
                    onNext={handleNext}
                    onClose={closeRoute}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MeterFormDialog
        open={dialogOpen}
        editing={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />
      <SharePaymentsDialog
        meter={shareMeter}
        onOpenChange={(open) => {
          if (!open) setShareMeter(null)
        }}
      />
      <MeterDetailSheet
        meter={viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
        onManagePayments={openSharePayments}
      />
      <DeleteMeterDialog
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}
