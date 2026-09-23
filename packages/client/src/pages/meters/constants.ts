import L from "leaflet"
import "leaflet/dist/leaflet.css"
import iconUrl from "leaflet/dist/images/marker-icon.png"
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png"
import shadowUrl from "leaflet/dist/images/marker-shadow.png"
import type { ShareStatus } from "@/lib/types"

export const markerIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export const STATUS_LABEL: Record<string, string> = {
  active: "common.status.active",
  inactive: "common.status.inactive",
  decommissioned: "meters.statuses.decommissioned",
}

export const SHARE_STATUS_LABEL: Record<ShareStatus, string> = {
  paid: "common.status.paid",
  partial: "meters.shareStatus.partial",
  pending: "common.status.pending",
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "common.method.cash" },
  { value: "transfer", label: "common.method.transferQR" },
] as const

export const DEFAULT_CENTER: [number, number] = [-17.359527, -66.241607]
