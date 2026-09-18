import { useTranslation } from "react-i18next"
import { Bell, CheckCheck, Mail, MailCheck, MailOpen } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
} from "@/hooks/notifications"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RowActions } from "@/components/ui/row-actions"
import { Skeleton } from "@/components/ui/skeleton"
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

  const { data: notifications, isLoading } = useNotifications()

  const markReadMutation = useMarkNotificationRead()

  const markAllMutation = useMarkAllRead()

  const unread = notifications?.filter((n) => !n.is_read).length ?? 0

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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !notifications?.length ? (
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
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={n.is_read ? "opacity-70" : undefined}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div
                  className={`mt-0.5 rounded-md p-2 ${
                    n.is_read
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {n.is_read ? (
                    <MailOpen className="size-4" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={TYPE_VARIANT[n.type]}>
                      {t(TYPE_LABEL[n.type] ?? `notifications.type.${n.type}`)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {n.message}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {n.member
                        ? `${n.member.first_name} ${n.member.last_name}`
                        : ""}
                    </span>
                    <span>{formatDate(n.created_at)}</span>
                  </div>
                </div>
                {!n.is_read ? (
                  <RowActions
                    items={[
                      {
                        label: t("notifications.markRead"),
                        icon: <MailCheck className="size-4" />,
                        permission: "notifications.update",
                        onClick: () => handleMarkRead(n.id),
                      },
                    ]}
                  />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
