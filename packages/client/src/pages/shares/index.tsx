import { useState } from "react"
import { useTranslation } from "react-i18next"
import { HandCoins, Pencil, Plus, Power } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { WaterShare } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useSearchShares } from "@/hooks/shares"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { useSortedData } from "@/hooks/use-sorted-data"
import ShareFormDialog from "./ShareFormDialog"
import DeactivateShareDialog from "./DeactivateShareDialog"
import { getValidityStatus, shareAccessor } from "./helpers"
import Can from "@/components/Can"

export default function SharesPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<WaterShare | null>(null)
  const [deactivating, setDeactivating] = useState<WaterShare | null>(null)

  const { data: shares, isLoading } = useSearchShares(true)

  const { sort, toggleSort } = useTableSort({ key: "valid_from", order: "desc" })

  const sortedShares = useSortedData(shares, sort, shareAccessor, "valid_from", "desc")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("shares.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("shares.subtitle")}
          </p>
        </div>
        <Can permission="shares.create">
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            {t("shares.newShare")}
          </Button>
        </Can>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="size-4" />
            {t("shares.pricing")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable<WaterShare>
            columns={[
              { key: "name", label: t("shares.name"), sortable: true, render: (s) => <span className="font-medium">{s.name}</span> },
              { key: "amount", label: t("shares.amount"), sortable: true, align: "right", render: (s) => <span className="tabular-nums font-semibold">{formatCurrency(s.amount)}</span> },
              { key: "valid_from", label: t("shares.validFrom"), sortable: true, render: (s) => <span>{s.valid_from}</span> },
              { key: "valid_until", label: t("shares.validUntil"), sortable: true, render: (s) => <span>{s.valid_until || "∞"}</span> },
              {
                key: "status",
                label: t("shares.status"),
                sortable: true,
                render: (s) => {
                  const v = getValidityStatus(s.valid_from, s.valid_until)
                  return <Badge variant={v.variant}>{t(v.label)}</Badge>
                },
              },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (share: WaterShare) => (
                  <RowActions
                    items={[
                      {
                        label: t("common.edit"),
                        icon: <Pencil className="size-4" />,
                        permission: "shares.update",
                        onClick: () => {
                          setEditing(share)
                          setDialogOpen(true)
                        },
                      },
                      ...(share.is_active
                        ? [
                            {
                              label: t("common.deactivate"),
                              icon: <Power className="size-4" />,
                              permission: "shares.update",
                              onClick: () => setDeactivating(share),
                            },
                          ]
                        : []),
                    ]}
                  />
                ),
              } as const,
            ]}
            data={sortedShares}
            sort={sort}
            onSort={toggleSort}
            isLoading={isLoading}
            emptyIcon={<HandCoins className="size-6 text-muted-foreground" />}
            emptyText={t("shares.empty")}
            rowKey={(s) => s.id}
          />
        </CardContent>
      </Card>

      <ShareFormDialog
        open={dialogOpen}
        editing={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />
      <DeactivateShareDialog
        deactivating={deactivating}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null)
        }}
      />
    </div>
  )
}
