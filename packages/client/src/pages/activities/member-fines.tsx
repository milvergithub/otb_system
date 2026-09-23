import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  CircleDollarSign,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react"
import {
  useMemberFines,
  useFinesStats,
  usePayFine,
  useCancelFine,
  usePayFinesBulk,
} from "@/hooks/activities"
import { useGetMember } from "@/hooks/members"
import { useAuth } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api"
import type { Fine, FineStatus } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { VirtualTable } from "@/components/ui/virtual-table"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const STATUS_ICON: Record<FineStatus, typeof CheckCircle> = {
  pending: Clock,
  paid: CheckCircle,
  cancelled: XCircle,
}

const STATUS_VARIANT: Record<FineStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "destructive",
  paid: "default",
  cancelled: "secondary",
}

function memberInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export default function MemberFinesPage() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canManage = hasPermission("activities.update")
  const canRead = hasPermission("activities.read") || hasPermission("members.viewFines")

  const { data: member, isLoading: memberLoading } = useGetMember(memberId, !!memberId)
  const { data: fines, isLoading: finesLoading } = useMemberFines(memberId)
  const { data: stats } = useFinesStats({ memberId })

  const payMut = usePayFine()
  const cancelMut = useCancelFine()
  const payBulkMut = usePayFinesBulk()

  const [paying, setPaying] = useState<Fine | null>(null)
  const [cancelling, setCancelling] = useState<Fine | null>(null)
  const [payNotes, setPayNotes] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [payBulkOpen, setPayBulkOpen] = useState(false)
  const [bulkNotes, setBulkNotes] = useState("")

  const pendingFines = (fines ?? []).filter((f) => f.status === "pending")
  const allPendingSelected =
    pendingFines.length > 0 && pendingFines.every((f) => selected.has(f.id))
  const selectedFines = (fines ?? []).filter((f) => selected.has(f.id))
  const selectedTotal = selectedFines.reduce((sum, f) => sum + parseFloat(f.amount), 0)

  const memberName = member
    ? `${member.first_name} ${member.last_name}`
    : `#${memberId ?? ""}`

  const handlePay = async () => {
    if (!paying) return
    try {
      await payMut.mutateAsync({ id: paying.id, notes: payNotes || undefined })
      toast.success(t("activities.finePaid"))
      setPaying(null)
      setPayNotes("")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  const handleCancel = async () => {
    if (!cancelling) return
    try {
      await cancelMut.mutateAsync({ id: cancelling.id, reason: cancelReason || undefined })
      toast.success(t("activities.fineCancelled"))
      setCancelling(null)
      setCancelReason("")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  const toggleSelect = (fineId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(fineId)) next.delete(fineId)
      else next.add(fineId)
      return next
    })
  }

  const toggleSelectAll = () => {
    const ids = pendingFines.map((f) => f.id)
    setSelected((prev) => {
      if (ids.length > 0 && ids.every((id) => prev.has(id))) {
        return new Set([...prev].filter((id) => !ids.includes(id)))
      }
      return new Set([...prev, ...ids])
    })
  }

  const handlePayBulk = async () => {
    if (selected.size === 0) return
    try {
      await payBulkMut.mutateAsync({
        ids: [...selected],
        notes: bulkNotes || undefined,
      })
      toast.success(t("activities.finePaid"))
      setPayBulkOpen(false)
      setBulkNotes("")
      setSelected(new Set())
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (!canRead) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("common.accessDenied")}</p>
      </div>
    )
  }

  if (memberLoading || finesLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/members")}>
          <ArrowLeft className="mr-1.5 size-4" />
          {t("activities.back")}
        </Button>
        <p className="text-muted-foreground">{t("activities.memberNotFound")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/members")}>
        <ArrowLeft className="mr-1.5 size-4" />
        {t("activities.back")}
      </Button>

      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="text-sm">
            {memberInitials(member.first_name, member.last_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{memberName}</h1>
          <Badge
            variant="secondary"
            className="w-fit gap-0 text-xs font-semibold px-2 py-0"
          >
            {member.ci}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <div className="text-sm text-muted-foreground">{t("activities.total")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats?.pending ?? 0}</div>
            <div className="text-sm text-muted-foreground">{t("activities.pending")}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(stats?.pendingAmount ?? "0"))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.paid ?? 0}</div>
            <div className="text-sm text-muted-foreground">{t("activities.paid")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{stats?.cancelled ?? 0}</div>
            <div className="text-sm text-muted-foreground">{t("activities.cancelled")}</div>
          </CardContent>
        </Card>
      </div>

      {!fines?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CircleDollarSign className="mb-4 size-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t("activities.noFines")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {canManage && pendingFines.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <span className="text-sm font-medium">
                {t("activities.selected", { count: selected.size })}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setBulkNotes("")
                  setPayBulkOpen(true)
                }}
                disabled={selected.size === 0 || payBulkMut.isPending}
              >
                {payBulkMut.isPending ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-1 size-4" />
                )}
                {t("activities.payAllSelected")}
              </Button>
            </div>
          )}
          <VirtualTable
            data={fines}
            estimateSize={60}
            height={600}
            emptyMessage={t("activities.noFines")}
            renderHeader={() => (
              <TableRow>
                {canManage && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={toggleSelectAll}
                      disabled={pendingFines.length === 0}
                    />
                  </TableHead>
                )}
                <TableHead>{t("activities.finesActivity")}</TableHead>
                <TableHead>{t("activities.finesType")}</TableHead>
                <TableHead className="text-right">{t("activities.finesAmount")}</TableHead>
                <TableHead>{t("activities.status")}</TableHead>
                <TableHead>{t("activities.finesDate")}</TableHead>
                {canManage && <TableHead className="text-right">{t("activities.finesActions")}</TableHead>}
              </TableRow>
            )}
            renderRow={(f: Fine) => {
              const StatusIcon = STATUS_ICON[f.status]
              return (
                <>
                  {canManage && (
                    <td className="p-2">
                      {f.status === "pending" && (
                        <Checkbox
                          checked={selected.has(f.id)}
                          onCheckedChange={() => toggleSelect(f.id)}
                        />
                      )}
                    </td>
                  )}
                  <td className="p-2">{f.activity?.name ?? f.activity_id}</td>
                <td className="p-2 text-muted-foreground">{f.fineType?.name ?? "-"}</td>
                <td className="p-2 text-right font-semibold">
                  {formatCurrency(parseFloat(f.amount))}
                </td>
                <td className="p-2">
                  <Badge variant={STATUS_VARIANT[f.status]} className="mt-1">
                    <StatusIcon className="mr-1 size-3" />
                    {t(`activities.${f.status}`)}
                  </Badge>
                </td>
                <td className="p-2 text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString()}
                </td>
                {canManage && (
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-1">
                      {f.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPaying(f)
                              setPayNotes("")
                            }}
                          >
                            <CheckCircle className="mr-1 size-4" />
                            {t("activities.pay")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              setCancelling(f)
                              setCancelReason("")
                            }}
                          >
                            <Ban className="mr-1 size-4" />
                            {t("activities.cancel")}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </>
            )
          }}
          />
        </>
      )}

      <Dialog open={!!paying} onOpenChange={() => setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("activities.payFine")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {t("activities.payFineConfirm", {
                name: memberName,
                amount: paying ? formatCurrency(parseFloat(paying.amount)) : "",
              })}
            </p>
            {paying && (
              <div className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("activities.finesActivity")}</span>
                  <span className="text-right font-medium">{paying.activity?.name ?? paying.activity_id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("activities.finesType")}</span>
                  <span className="text-right font-medium">{paying.fineType?.name ?? "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("activities.finesDate")}</span>
                  <span className="text-right font-medium">{new Date(paying.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between gap-2 border-t pt-1 font-semibold">
                  <span>{t("activities.finesAmount")}</span>
                  <span className="text-right tabular-nums">{formatCurrency(parseFloat(paying.amount))}</span>
                </div>
              </div>
            )}
            <Input
              placeholder={t("activities.notesOptional")}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handlePay} disabled={payMut.isPending}>
              {payMut.isPending ? t("common.saving") : t("activities.confirmPay")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payBulkOpen} onOpenChange={() => setPayBulkOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("activities.payAllSelected")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {t("activities.payAllSelectedConfirm", {
                count: selected.size,
                amount: formatCurrency(selectedTotal),
              })}
            </p>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
              {selectedFines.map((f) => (
                <div key={f.id} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("activities.finesActivity")}</span>
                    <span className="text-right font-medium">{f.activity?.name ?? f.activity_id}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("activities.finesType")}</span>
                    <span className="text-right font-medium">{f.fineType?.name ?? "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("activities.finesDate")}</span>
                    <span className="text-right font-medium">{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-t pt-1 font-semibold">
                    <span>{t("activities.finesAmount")}</span>
                    <span className="text-right tabular-nums">{formatCurrency(parseFloat(f.amount))}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>{t("activities.total")}</span>
                <span className="tabular-nums">{formatCurrency(selectedTotal)}</span>
              </div>
            </div>
            <Input
              placeholder={t("activities.notesOptional")}
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handlePayBulk} disabled={payBulkMut.isPending}>
              {payBulkMut.isPending ? t("common.saving") : t("activities.confirmPay")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelling} onOpenChange={() => setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("activities.cancelFine")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("activities.cancelFineConfirm", { name: memberName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder={t("activities.reasonOptional")}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMut.isPending ? t("common.saving") : t("activities.confirmCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}