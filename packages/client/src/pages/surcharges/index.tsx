import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Percent, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { Surcharge } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useSurcharges } from "@/hooks/billing"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { useSortedData } from "@/hooks/use-sorted-data"
import SurchargeFormDialog from "./SurchargeFormDialog"
import DeleteSurchargeDialog from "./DeleteSurchargeDialog"
import { surchargeAccessor, formatValue } from "./helpers"
import Can from "@/components/Can"

export default function SurchargesPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Surcharge | null>(null)
  const [deleting, setDeleting] = useState<Surcharge | null>(null)

  const { data: surcharges, isLoading } = useSurcharges()

  const { sort, toggleSort } = useTableSort({ key: "name", order: "asc" })

  const sortedSurcharges = useSortedData(surcharges, sort, surchargeAccessor, "name", "asc")

  if (!hasPermission("surcharges.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("surcharges.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("surcharges.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("surcharges.subtitle")}
          </p>
        </div>
        <Can permission="surcharges.create">
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            {t("surcharges.newSurcharge")}
          </Button>
        </Can>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<Surcharge>
            columns={[
              { key: "name", label: t("surcharges.name"), sortable: true, render: (d) => <span className="font-medium">{d.name}</span> },
              {
                key: "type",
                label: t("surcharges.typeLabel"),
                sortable: true,
                render: (d) => <Badge variant="secondary">{t(`surcharges.type.${d.type}`)}</Badge>,
              },
              { key: "value", label: t("surcharges.value"), sortable: true, render: (d) => <span className="font-medium">{formatValue(d)}</span> },
              { key: "description", label: t("surcharges.description"), sortable: true, render: (d) => <span className="text-muted-foreground">{d.description || "—"}</span> },
              {
                key: "is_active",
                label: t("surcharges.status"),
                sortable: true,
                render: (d) =>
                  d.is_active ? <Badge>{t("common.status.active")}</Badge> : <Badge variant="outline">{t("common.status.inactive")}</Badge>,
              },
              {
                key: "is_default",
                label: t("surcharges.defaultLabel"),
                sortable: true,
                render: (d) =>
                  d.is_default ? <Badge>{t("surcharges.defaultLabel")}</Badge> : <span className="text-muted-foreground">—</span>,
              },
              { key: "created_at", label: t("surcharges.created"), sortable: true, render: (d) => <span className="text-muted-foreground">{formatDate(d.created_at)}</span> },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (surcharge) => (
                  <RowActions
                    items={[
                      { label: t("common.edit"), icon: <Pencil className="size-4" />, permission: "surcharges.update", onClick: () => { setEditing(surcharge); setDialogOpen(true) } },
                      { label: t("common.delete"), icon: <Trash2 className="size-4" />, permission: "surcharges.delete", destructive: true, onClick: () => setDeleting(surcharge) },
                    ]}
                  />
                ),
              },
            ]}
            data={sortedSurcharges}
            sort={sort}
            onSort={toggleSort}
            isLoading={isLoading}
            emptyIcon={<Percent className="size-6 text-muted-foreground" />}
            emptyText={t("surcharges.empty")}
            rowKey={(d) => d.id}
          />
        </CardContent>
      </Card>

      <SurchargeFormDialog
        open={dialogOpen}
        editing={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />
      <DeleteSurchargeDialog
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}
