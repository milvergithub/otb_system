import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bell, CheckCheck, Mail, MailCheck, MailOpen, Search } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { AppNotification } from "@/lib/types"
import { useSearchNotifications, useMarkNotificationRead, useMarkAllRead, useUnreadCount } from "@/hooks/notifications"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RowActions } from "@/components/ui/row-actions"
import { DataTable } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { toast } from "sonner"

const TYPE_LABEL: Record<string, string> = {
  expiration: "notifications.type.expiration",
  pending: "notifications.type.pending",
  overdue: "notifications.type.overdue",
  payment: "notifications.type.payment",
}

const TYPE_VARIANT: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  expiration: "outline",
  pending: "secondary",
  overdue: "destructive",
  payment: "default",
}

export default function NotificationsPage() {
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearch = useDebounce(searchInput.trim(), 300)
  const [search, setSearch] = useState(debouncedSearch)
  if (search !== debouncedSearch) {
    setSearch(debouncedSearch)
    setPage(1)
  }

  const { data, isLoading } = useSearchNotifications({
    page,
    search,
  })

  const markReadMutation = useMarkNotificationRead()
  const markAllMutation = useMarkAllRead()

  const unread = useUnreadCount().data ?? 0

  function handleMarkAll() {
    markAllMutation.mutate(undefined, {
      onSuccess: () => toast.success(t("notifications.markAllSuccess")),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

  function handleMarkRead(id: string) {
    markReadMutation.mutate(id, {
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("notifications.subtitle")}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            variant="outline"
            onClick={handleMarkAll}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="mr-2 size-4" />
            {t("notifications.markAll")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("common.search")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">{t("notifications.empty")}</p>
            <p className="text-sm text-muted-foreground">
              {t("notifications.emptySubtitle")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable<AppNotification>
              columns={[
                {
                  key: "type",
                  label: t("notifications.typeLabel"),
                  render: (n) => (
                    <Badge variant={TYPE_VARIANT[n.type]}>
                      {t(TYPE_LABEL[n.type] ?? `notifications.type.${n.type}`)}
                    </Badge>
                  ),
                },
                {
                  key: "title",
                  label: t("notifications.title"),
                  render: (n) => (
                    <span className={n.is_read ? "opacity-70" : "font-medium"}>
                      {n.title}
                    </span>
                  ),
                },
                {
                  key: "message",
                  label: t("notifications.message"),
                  render: (n) => (
                    <span className="text-muted-foreground">
                      {n.message}
                    </span>
                  ),
                },
                {
                  key: "member",
                  label: t("notifications.member"),
                  render: (n) => (
                    <span className="text-muted-foreground">
                      {n.member
                        ? `${n.member.first_name} ${n.member.last_name}`
                        : "—"}
                    </span>
                  ),
                },
                {
                  key: "created_at",
                  label: t("notifications.date"),
                  render: (n) => (
                    <span className="text-muted-foreground text-xs">
                      {formatDate(n.created_at)}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  className: "w-10",
                  render: (n) =>
                    !n.is_read ? (
                      <RowActions
                        items={[
                          {
                            label: t("notifications.markRead"),
                            icon: <MailOpen className="size-4" />,
                            permission: "notifications.update",
                            onClick: () => handleMarkRead(n.id),
                          },
                        ]}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("notifications.read")}
                      </span>
                    ),
                },
              ]}
              data={items}
              isLoading={isLoading}
              emptyIcon={<Bell className="mx-auto size-6 text-muted-foreground" />}
              emptyText={t("notifications.empty")}
              rowKey={(n) => n.id}
            />
          </CardContent>
        </Card>
      )}

      {data ? (
        <DataTablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
          noun={t("notifications.title")}
        />
      ) : null}
    </div>
  )
}
