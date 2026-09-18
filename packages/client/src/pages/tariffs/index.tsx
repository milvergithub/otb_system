import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Copy, Pencil, Plus, Power, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { BaseTariff, Tariff } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useSearchTariffs, useSearchBaseTariffs } from "@/hooks/tariffs"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { useSortedData } from "@/hooks/use-sorted-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Can from "@/components/Can"
import BaseTariffDialog from "./BaseTariffDialog"
import RangeTariffDialog from "./RangeTariffDialog"
import CopyTariffsDialog from "./CopyTariffsDialog"
import DeactivateBaseTariffDialog from "./DeactivateBaseTariffDialog"
import DeactivateRangeTariffDialog from "./DeactivateRangeTariffDialog"
import {
  baseTariffAccessor,
  getValidityStatus,
  rangeLabel,
  rangeTariffAccessor,
} from "./helpers"

export default function TariffsPage() {
  const { hasPermission } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("base")

  const [baseDialogOpen, setBaseDialogOpen] = useState(false)
  const [editingBase, setEditingBase] = useState<BaseTariff | null>(null)
  const [deactivatingBase, setDeactivatingBase] = useState<BaseTariff | null>(null)

  const [rangeDialogOpen, setRangeDialogOpen] = useState(false)
  const [editingRange, setEditingRange] = useState<Tariff | null>(null)
  const [deactivatingRange, setDeactivatingRange] = useState<Tariff | null>(null)

  const [copyDialogOpen, setCopyDialogOpen] = useState(false)

  const { data: baseTariffs, isLoading: baseLoading } = useSearchBaseTariffs()

  const { data: rangeTariffs, isLoading: rangeLoading } = useSearchTariffs(true)

  const { sort: baseSort, toggleSort: toggleBaseSort } = useTableSort({
    key: "valid_from",
    order: "desc",
  })

  const { sort: rangeSort, toggleSort: toggleRangeSort } = useTableSort({
    key: "valid_from",
    order: "desc",
  })

  const sortedBaseTariffs = useSortedData(baseTariffs, baseSort, baseTariffAccessor, "valid_from", "desc")

  const sortedRangeTariffs = useSortedData(rangeTariffs, rangeSort, rangeTariffAccessor, "valid_from", "desc")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("tariffs.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("tariffs.subtitle")}
          </p>
        </div>
        <Can permission="tariffs.create">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
              <Copy className="mr-2 size-4" />
              {t("tariffs.copyTariffs")}
            </Button>
            <Button
              onClick={() => {
                if (activeTab === "base") {
                  setEditingBase(null)
                  setBaseDialogOpen(true)
                } else {
                  setEditingRange(null)
                  setRangeDialogOpen(true)
                }
              }}
            >
              <Plus className="mr-2 size-4" />
              {activeTab === "base"
                ? t("tariffs.newBaseTariff")
                : t("tariffs.newRange")}
            </Button>
          </div>
        </Can>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="base">{t("tariffs.baseTab")}</TabsTrigger>
          <TabsTrigger value="ranges">{t("tariffs.rangesTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("tariffs.baseTab")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable<BaseTariff>
                columns={[
                  { key: "name", label: t("tariffs.name"), sortable: true, render: (tariff) => <span className="font-medium">{tariff.name}</span> },
                  { key: "type_id", label: t("tariffs.meterType"), sortable: true, render: (tariff) => <span>{tariff.type?.name ?? t("tariffs.allTypes")}</span> },
                  { key: "amount", label: t("tariffs.amount"), sortable: true, align: "right", render: (tariff) => <span className="tabular-nums font-semibold">{formatCurrency(tariff.amount)}</span> },
                  { key: "valid_from", label: t("tariffs.validFrom"), sortable: true, render: (tariff) => <span>{tariff.valid_from}</span> },
                  { key: "valid_until", label: t("tariffs.validUntil"), sortable: true, render: (tariff) => <span>{tariff.valid_until || "∞"}</span> },
                  {
                    key: "status",
                    label: t("tariffs.status"),
                    sortable: true,
                    render: (tariff) => {
                      const v = getValidityStatus(tariff.valid_from, tariff.valid_until)
                      return <Badge variant={v.variant}>{t(v.label)}</Badge>
                    },
                  },
                  {
                    key: "actions",
                    label: "",
                    className: "w-10",
                    stickyRight: true,
                    render: (tariff: BaseTariff) => (
                      <RowActions
                        items={[
                          { label: t("common.edit"), icon: <Pencil className="size-4" />, permission: "tariffs.update", onClick: () => { setEditingBase(tariff); setBaseDialogOpen(true) } },
                          ...(tariff.is_active ? [{ label: t("common.deactivate"), icon: <Power className="size-4" />, permission: "tariffs.update", onClick: () => setDeactivatingBase(tariff) }] : []),
                        ]}
                      />
                    ),
                  } as const,
                ]}
                data={sortedBaseTariffs}
                sort={baseSort}
                onSort={toggleBaseSort}
                isLoading={baseLoading}
                emptyIcon={<TrendingUp className="size-6 text-muted-foreground" />}
                emptyText={t("tariffs.noBaseTariff")}
                rowKey={(tariff) => tariff.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranges" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <DataTable<Tariff>
                columns={[
                  { key: "name", label: t("tariffs.name"), sortable: true, render: (tariff) => <span className="font-medium">{tariff.name}</span> },
                  { key: "min_cubic_meters", label: t("tariffs.range"), sortable: true, render: (tariff) => <span>{rangeLabel(tariff)}</span> },
                  { key: "price_per_cubic_meter", label: t("tariffs.pricePerM3Short"), sortable: true, align: "right", render: (tariff) => <span className="tabular-nums font-semibold">{formatCurrency(tariff.price_per_cubic_meter)} / m³</span> },
                  { key: "valid_from", label: t("tariffs.validFrom"), sortable: true, render: (tariff) => <span>{tariff.valid_from}</span> },
                  { key: "valid_until", label: t("tariffs.validUntil"), sortable: true, render: (tariff) => <span>{tariff.valid_until || "∞"}</span> },
                  {
                    key: "status",
                    label: t("tariffs.status"),
                    sortable: true,
                    render: (tariff) => {
                      const v = getValidityStatus(tariff.valid_from, tariff.valid_until)
                      return <Badge variant={v.variant}>{t(v.label)}</Badge>
                    },
                  },
                  {
                    key: "actions",
                    label: "",
                    className: "w-10",
                    stickyRight: true,
                    render: (tariff: Tariff) => (
                      <RowActions
                        items={[
                          { label: t("common.edit"), icon: <Pencil className="size-4" />, permission: "tariffs.update", onClick: () => { setEditingRange(tariff); setRangeDialogOpen(true) } },
                          ...(tariff.is_active ? [{ label: t("common.deactivate"), icon: <Power className="size-4" />, permission: "tariffs.update", onClick: () => setDeactivatingRange(tariff) }] : []),
                        ]}
                      />
                    ),
                  } as const,
                ]}
                data={sortedRangeTariffs}
                sort={rangeSort}
                onSort={toggleRangeSort}
                isLoading={rangeLoading}
                emptyIcon={<TrendingUp className="size-6 text-muted-foreground" />}
                emptyText={t("tariffs.noRangeTariffs")}
                rowKey={(tariff) => tariff.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BaseTariffDialog
        open={baseDialogOpen}
        editing={editingBase}
        onOpenChange={(open) => {
          setBaseDialogOpen(open)
          if (!open) setEditingBase(null)
        }}
      />
      <RangeTariffDialog
        open={rangeDialogOpen}
        editing={editingRange}
        onOpenChange={(open) => {
          setRangeDialogOpen(open)
          if (!open) setEditingRange(null)
        }}
      />
      <CopyTariffsDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
      />
      <DeactivateBaseTariffDialog
        deactivating={deactivatingBase}
        onOpenChange={(open) => {
          if (!open) setDeactivatingBase(null)
        }}
      />
      <DeactivateRangeTariffDialog
        deactivating={deactivatingRange}
        onOpenChange={(open) => {
          if (!open) setDeactivatingRange(null)
        }}
      />
    </div>
  )
}
