import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  Eye,
  Package,
  Layers,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { Asset } from "@/lib/types"
import {
  useSearchAssets,
  useAssetCategories,
  useAssetLocations,
} from "@/hooks/assets"
import { useAuth } from "@/lib/auth"
import { useTableSort } from "@/hooks/use-sort"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ComboboxSelect } from "@/components/ui/combobox"
import { RowActions } from "@/components/ui/row-actions"
import { DataTable } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import AssetFormDialog from "./AssetFormDialog"
import BulkAssetDialog from "./BulkAssetDialog"
import DeleteAssetDialog from "./DeleteAssetDialog"
import AssetDetailSheet from "./AssetDetailSheet"
import {
  STATUS_LABEL,
  STATUS_VARIANT,
  CONDITION_LABEL,
  CONDITION_VARIANT,
} from "./constants"
import { responsibleLabel } from "./helpers"
import Can from "@/components/Can"

export default function AssetsPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [status, setStatus] = useState("")
  const [condition, setCondition] = useState("")

  // dialogs
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [deleting, setDeleting] = useState<Asset | null>(null)
  const [selected, setSelected] = useState<Asset | null>(null)

  const { sort, toggleSort } = useTableSort({ key: "created_at", order: "desc" }, () => setPage(1))

  const { data, isLoading } = useSearchAssets({
    page,
    search,
    categoryId,
    locationId,
    status: (status || undefined) as Asset["status"] | undefined,
    condition: condition || undefined,
    sortBy: sort?.key,
    sortOrder: sort?.order,
  })
  const { data: categories } = useAssetCategories()
  const { data: locations } = useAssetLocations()

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(asset: Asset) {
    setEditing(asset)
    setDialogOpen(true)
  }

  if (!hasPermission("assets.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("common.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("assets.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("assets.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Can permission="assets.create">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Layers className="mr-2 size-4" />
              {t("assets.bulkCreate")}
            </Button>
          </Can>
          <Can permission="assets.create">
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              {t("assets.newAsset")}
            </Button>
          </Can>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("assets.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput.trim())
                setPage(1)
              }
            }}
          />
        </div>
        <ComboboxSelect
          value={categoryId}
          onValueChange={(v) => { setCategoryId(v); setPage(1) }}
          options={[{ label: t("assets.allCategories"), value: "" }, ...(categories ?? []).map((c) => ({ label: c.name, value: c.id }))]}
          placeholder={t("assets.category")}
          className="w-44"
        />
        <ComboboxSelect
          value={locationId}
          onValueChange={(v) => { setLocationId(v); setPage(1) }}
          options={[{ label: t("assets.allLocations"), value: "" }, ...(locations ?? []).map((l) => ({ label: l.name, value: l.id }))]}
          placeholder={t("assets.location")}
          className="w-44"
        />
        <ComboboxSelect
          value={status}
          onValueChange={(v) => { setStatus(v); setPage(1) }}
          options={[
            { label: t("common.all"), value: "" },
            { label: t("assets.status.active"), value: "active" },
            { label: t("assets.status.loaned"), value: "loaned" },
            { label: t("assets.status.in_maintenance"), value: "in_maintenance" },
            { label: t("assets.status.lost"), value: "lost" },
            { label: t("assets.status.retired"), value: "retired" },
          ]}
          placeholder={t("assets.statusLabel")}
          className="w-44"
        />
        <ComboboxSelect
          value={condition}
          onValueChange={(v) => { setCondition(v); setPage(1) }}
          options={[
            { label: t("common.all"), value: "" },
            { label: t("assets.condition.new"), value: "new" },
            { label: t("assets.condition.good"), value: "good" },
            { label: t("assets.condition.fair"), value: "fair" },
            { label: t("assets.condition.poor"), value: "poor" },
          ]}
          placeholder={t("assets.conditionLabel")}
          className="w-40"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<Asset>
            columns={[
              {
                key: "code",
                label: t("assets.code"),
                sortable: true,
                render: (a) => <span className="font-mono text-xs">{a.code}</span>,
              },
              {
                key: "name",
                label: t("assets.name"),
                sortable: true,
                render: (a) => <span className="font-medium">{a.name}</span>,
              },
              {
                key: "category",
                label: t("assets.category"),
                sortable: true,
                render: (a) => <span className="text-muted-foreground">{a.category?.name ?? "—"}</span>,
              },
              {
                key: "location",
                label: t("assets.location"),
                sortable: true,
                render: (a) => <span className="text-muted-foreground">{a.location?.name ?? "—"}</span>,
              },
              {
                key: "status",
                label: t("assets.statusLabel"),
                sortable: true,
                render: (a) => (
                  <Badge variant={STATUS_VARIANT[a.status]} className="text-xs">
                    {t(STATUS_LABEL[a.status])}
                  </Badge>
                ),
              },
              {
                key: "condition",
                label: t("assets.conditionLabel"),
                sortable: true,
                render: (a) => (
                  <Badge variant={CONDITION_VARIANT[a.condition]} className="text-xs">
                    {t(CONDITION_LABEL[a.condition])}
                  </Badge>
                ),
              },
              {
                key: "responsible",
                label: t("assets.responsible"),
                render: (a) => <span className="text-muted-foreground">{responsibleLabel(a) || "—"}</span>,
              },
              {
                key: "value",
                label: t("assets.acquisitionValue"),
                sortable: true,
                align: "right",
                render: (a) => <span className="font-medium">{formatCurrency(a.acquisition_value ?? "0")}</span>,
              },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (asset: Asset) => (
                  <RowActions
                    items={[
                      {
                        label: t("common.view"),
                        icon: <Eye className="size-4" />,
                        permission: "assets.read",
                        onClick: () => setSelected(asset),
                      },
                      {
                        label: t("common.edit"),
                        icon: <Pencil className="size-4" />,
                        permission: "assets.update",
                        onClick: () => openEdit(asset),
                      },
                      {
                        label: t("common.delete"),
                        icon: <Trash2 className="size-4" />,
                        permission: "assets.delete",
                        destructive: true,
                        onClick: () => setDeleting(asset),
                      },
                    ]}
                  />
                ),
              } as const,
            ]}
            data={data?.items ?? []}
            sort={sort}
            onSort={toggleSort}
            isLoading={isLoading}
            emptyIcon={<Package className="mx-auto size-6 text-muted-foreground" />}
            emptyText={t("assets.noAssets")}
            rowKey={(a) => a.id}
            onRowClick={(a) => setSelected(a)}
          />
        </CardContent>
      </Card>

      {data ? (
        <DataTablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
          noun={t("assets.noun")}
        />
      ) : null}

      <AssetFormDialog open={dialogOpen} editing={editing} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }} />
      <BulkAssetDialog open={bulkOpen} onOpenChange={setBulkOpen} />
      <DeleteAssetDialog assetName={deleting?.name} assetId={deleting?.id} onOpenChange={(open) => { if (!open) setDeleting(null) }} />
      <AssetDetailSheet key={selected?.id ?? "none"} asset={selected} onOpenChange={(open) => { if (!open) setSelected(null) }} />
    </div>
  )
}
