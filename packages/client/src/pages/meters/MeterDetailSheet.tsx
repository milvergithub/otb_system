import { ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import { formatCurrency, formatDate, getWhatsAppUrl, googleMapsUrl } from "@/lib/utils"
import type { Meter } from "@/lib/types"
import { useGetMeter } from "@/hooks/meters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  STATUS_LABEL,
  SHARE_STATUS_LABEL,
  markerIcon,
} from "./constants"
import { shareStatusOf, hasCoords, useMemberName } from "./helpers"

interface MeterDetailSheetProps {
  meter: Meter | null
  onOpenChange: (open: boolean) => void
  onManagePayments: (meter: Meter) => void
}

export default function MeterDetailSheet({
  meter,
  onOpenChange,
  onManagePayments,
}: MeterDetailSheetProps) {
  const { t } = useTranslation()
  const memberName = useMemberName()
  const { data: meterDetail } = useGetMeter(meter?.id, !!meter)

  return (
    <Sheet open={!!meter} onOpenChange={(open) => !open && onOpenChange(false)}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:sm:w-1/2"
      >
        <SheetHeader>
          <SheetTitle className="font-mono">{meter?.code}</SheetTitle>
          <SheetDescription>
            {meter ? memberName(meter.member_id) : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">
              {t("meters.location")}
            </h3>
            {meter && hasCoords(meter) ? (
              <div className="space-y-2">
                <MapContainer
                  center={[
                    parseFloat(meter.latitude!),
                    parseFloat(meter.longitude!),
                  ]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-[60vh] w-full rounded-md border"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    icon={markerIcon}
                    position={[
                      parseFloat(meter.latitude!),
                      parseFloat(meter.longitude!),
                    ]}
                  >
                    <Popup>
                      <div className="w-64 space-y-2">
                        <div className="flex items-center justify-start gap-2">
                          <Badge variant="outline">{meter.type?.name ?? "—"}</Badge>
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
                        {meter.member ? (
                          <div className="space-y-1 border-t pt-2 text-xs">
                            <p className="font-semibold text-muted-foreground">
                              {t("meters.member")}
                            </p>
                            <dl className="space-y-0.5">
                              <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">{t("meters.name")}</dt>
                                <dd className="text-right font-medium">
                                  {meter.member.first_name}{" "}
                                  {meter.member.last_name}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">{t("meters.ci")}</dt>
                                <dd className="text-right font-medium">
                                  {meter.member.ci ?? "—"}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">{t("meters.phone")}</dt>
                                <dd className="text-right font-medium">
                                  {meter.member.phone ? (
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
                        ) : null}
                        <div className="space-y-1 border-t pt-2 text-xs">
                          <p className="font-semibold text-muted-foreground">
                            {t("meters.meter")}
                          </p>
                          <dl className="space-y-0.5">
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">{t("meters.address")}</dt>
                              <dd className="text-right font-medium">
                                {meter.address}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">{t("meters.installed")}</dt>
                              <dd className="text-right font-medium">
                                {formatDate(meter.installed_at)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <a
                          href={googleMapsUrl(
                            meter.latitude!,
                            meter.longitude!,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 pt-1 text-xs text-primary underline underline-offset-4"
                        >
                          <ExternalLink className="size-3" />
                          {t("meters.openInGoogleMaps")}
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
                <p className="text-xs text-muted-foreground">
                  {parseFloat(meter.latitude!).toFixed(6)},{" "}
                  {parseFloat(meter.longitude!).toFixed(6)}
                </p>
                <a
                  href={googleMapsUrl(meter.latitude!, meter.longitude!)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
                >
                  <ExternalLink className="size-3" />
                  {t("meters.openInGoogleMaps")}
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("meters.noLocationSet")}</p>
            )}
          </div>

          {meter ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground">
                {t("meters.waterAction")}
              </h3>
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  title={t("meters.managePayments")}
                  onClick={() => onManagePayments(meter)}
                >
                  <Badge
                    variant={
                      shareStatusOf(meter) === "paid"
                        ? "default"
                        : shareStatusOf(meter) === "partial"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {t(SHARE_STATUS_LABEL[shareStatusOf(meter)])}
                  </Badge>
                </Button>
                <p className="text-sm">
                  <span className="font-semibold">
                    {formatCurrency(meter.sharePaid ?? 0)}
                  </span>
                  {meter.shareTotal ? (
                    <span className="text-muted-foreground">
                      {" "}
                      / {formatCurrency(meter.shareTotal)}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">
              {t("meters.consumptionHistory")}
            </h3>
            {meterDetail?.consumptions?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meters.period")}</TableHead>
                    <TableHead className="text-right">m³</TableHead>
                    <TableHead className="text-right">{t("meters.reading")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meterDetail.consumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">
                        {c.month}/{c.year}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {c.cubic_meters}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {c.current_reading}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("meters.noConsumption")}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
