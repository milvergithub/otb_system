import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Percent, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { Discount } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useDiscounts } from "@/hooks/billing"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { useSortedData } from "@/hooks/use-sorted-data"
import DiscountFormDialog from "./DiscountFormDialog"
import DeleteDiscountDialog from "./DeleteDiscountDialog"
import { discountAccessor, formatValue } from "./helpers"
import Can from "@/components/Can"

export default function DiscountsPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Discount | null>(null)
  const [deleting, setDeleting] = useState<Discount | null>(null)

  const { data: discounts, isLoading } = useDiscounts()

  const { sort, toggleSort } = useTableSort({ key: "name", order: "asc" })

  const sortedDiscounts = useSortedData(discounts, sort, discountAccessor, "name", "asc")

  if (!hasPermission("discounts.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("discounts.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("discounts.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("discounts.subtitle")}
          </p>
        </div>
        <Can permission="discounts.create">
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            {t("discounts.newDiscount")}
          </Button>
        </Can>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<Discount>
            columns={[
              { key: "name", label: t("discounts.name"), sortable: true, render: (d) => <span className="font-medium">{d.name}</span> },
              {
                key: "type",
                label: t("discounts.typeLabel"),
                sortable: true,
                render: (d) => <Badge variant="secondary">{t(`discounts.type.${d.type}`)}</Badge>,
              },
              { key: "value", label: t("discounts.value"), sortable: true, render: (d) => <span className="font-medium">{formatValue(d)}</span> },
              { key: "description", label: t("discounts.description"), sortable: true, render: (d) => <span className="text-muted-foreground">{d.description || "—"}</span> },
              {
                key: "is_active",
                label: t("discounts.status"),
                sortable: true,
                render: (d) =>
                  d.is_active ? <Badge>{t("common.status.active")}</Badge> : <Badge variant="outline">{t("common.status.inactive")}</Badge>,
              },
              { key: "created_at", label: t("discounts.created"), sortable: true, render: (d) => <span className="text-muted-foreground">{formatDate(d.created_at)}</span> },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (discount) => (
                  <RowActions
                    items={[
                      { label: t("common.edit"), icon: <Pencil className="size-4" />, permission: "discounts.update", onClick: () => { setEditing(discount); setDialogOpen(true) } },
                      { label: t("common.delete"), icon: <Trash2 className="size-4" />, permission: "discounts.delete", destructive: true, onClick: () => setDeleting(discount) },
                    ]}
                  />
                ),
              },
            ]}
            data={sortedDiscounts}
            sort={sort}
            onSort={toggleSort}
            isLoading={isLoading}
            emptyIcon={<Percent className="size-6 text-muted-foreground" />}
            emptyText={t("discounts.empty")}
            rowKey={(d) => d.id}
          />
        </CardContent>
      </Card>

      <DiscountFormDialog
        open={dialogOpen}
        editing={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />
      <DeleteDiscountDialog
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}
