import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft, CalendarDays, Share2, Trash2, UserPlus } from "lucide-react"
import {
  useGetActivity,
  useActivityShares,
  useShareActivity,
  useUnshareActivity,
} from "@/hooks/activities"
import { useSearchUsers } from "@/hooks/users"
import type { User } from "@/lib/types"
import { getApiErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ComboboxSelect } from "@/components/ui/combobox"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Can from "@/components/Can"

export default function ActivitySharePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { data: activity, isLoading: loadingActivity } = useGetActivity(id)
  const { data: shares, isLoading: loadingShares } = useActivityShares(id)
  const shareMut = useShareActivity()
  const unshareMut = useUnshareActivity()

  const [selectedUserId, setSelectedUserId] = useState("")
  const [removingUser, setRemovingUser] = useState<User | null>(null)

  const { data: users } = useSearchUsers()

  const formatShortDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString()

  const sharedUserIds = new Set(shares?.map((s) => s.user_id) ?? [])

  const userOptions = [
    ...(users
      ?.filter((u) => u.is_active && !sharedUserIds.has(u.id))
      .map((u) => ({ label: u.full_name || u.email, value: u.id })) ?? []),
  ]

  const handleShare = async () => {
    if (!id || !selectedUserId) return
    try {
      await shareMut.mutateAsync({ activityId: id, userId: selectedUserId })
      toast.success(t("common.saved"))
      setSelectedUserId("")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  const handleUnshare = async () => {
    if (!id || !removingUser) return
    try {
      await unshareMut.mutateAsync({ activityId: id, userId: removingUser.id })
      toast.success(t("common.deleted"))
      setRemovingUser(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (loadingActivity) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>
  }

  if (!activity) {
    return <p className="text-muted-foreground">{t("common.noData")}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/actividades")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{activity.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatShortDate(activity.date)} · {activity.start_time} - {activity.end_time}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="size-5" />
            {t("activities.shareActivity")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium">{t("activities.searchEmail")}</label>
              <ComboboxSelect
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                options={userOptions}
                placeholder={t("activities.searchEmail")}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleShare}
              disabled={!selectedUserId || shareMut.isPending}
            >
              <UserPlus className="mr-2 size-4" />
              {shareMut.isPending ? t("common.saving") : t("activities.shareActivity")}
            </Button>
          </div>

          {loadingShares ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : !shares?.length ? (
            <p className="text-muted-foreground">{t("activities.noShares")}</p>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {(share.user.full_name ?? share.user.email)
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {share.user.full_name || share.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {share.user.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {share.permission}
                    </Badge>
                  </div>
                  <Can permission="activities.update">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => setRemovingUser(share.user)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </Can>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removingUser} onOpenChange={() => setRemovingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("activities.unshare")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("activities.unshare")} {removingUser?.full_name || removingUser?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnshare}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unshareMut.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
