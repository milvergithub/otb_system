import { useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Play,
  Upload,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type {
  Activity,
  AttendanceResult,
  Fine,
  FineSource,
} from "@/lib/types"
import {
  useActivityEvidence,
  useActivitySessions,
  useActivitySummary,
  useAttendance,
  useChangeActivityStatus,
  useCreateManualFine,
  useDeleteActivityEvidence,
  useFineTypes,
  useFines,
  useGetActivity,
  useUploadActivityEvidence,
} from "@/hooks/activities"
import { useSearchFinances } from "@/hooks/finances"
import { useAllMembers } from "@/hooks/members"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Can from "@/components/Can"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  scheduled: "outline",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
}

const RESULT_VARIANT: Record<AttendanceResult, "default" | "secondary" | "outline" | "destructive"> = {
  present: "default",
  late: "outline",
  left_early: "outline",
  absent: "destructive",
  excused: "secondary",
  pending: "secondary",
}

const SOURCE_KEY: Record<FineSource, string> = {
  attendance: "activities.sourceAttendance",
  manual: "activities.sourceManual",
  other: "activities.sourceOther",
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString()
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function EvidenceTab({ activity }: { activity: Activity }) {
  const { t } = useTranslation()
  const { data: evidence, isLoading } = useActivityEvidence(activity.id)
  const upload = useUploadActivityEvidence()
  const remove = useDeleteActivityEvidence()
  const [description, setDescription] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const isAllowedFile = (file: File) =>
    file.type.startsWith("image/") || file.type === "application/pdf"

  const onFile = async (file: File) => {
    if (!isAllowedFile(file)) {
      toast.error(t("activities.evidenceInvalidType"))
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    const type = file.type.startsWith("image/") ? "photo" : "document"
    try {
      const fileBase64 = await toBase64(file)
      await upload.mutateAsync({
        activityId: activity.id,
        fileBase64,
        fileName: file.name,
        mimeType: file.type,
        type,
        description: description || undefined,
      })
      setDescription("")
      if (fileRef.current) fileRef.current.value = ""
      toast.success(t("common.created"))
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <Can permission="activities.manageEvidence">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-2">
              <Label htmlFor="evidence-description">
                {t("activities.evidenceDescription")}
              </Label>
              <Input
                id="evidence-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onFile(file)
                }}
              />
              <Button
                variant="outline"
                disabled={upload.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 size-4" />
                {t("activities.uploadEvidence")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !evidence?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Paperclip className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t("activities.noEvidence")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evidence.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 p-4">
                {item.type === "photo" && item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <img
                      src={item.url}
                      alt={item.file_name}
                      className="h-40 w-full rounded-md object-cover"
                    />
                  </a>
                ) : item.type === "video" && item.url ? (
                  <video src={item.url} controls className="h-40 w-full rounded-md" />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-md bg-muted">
                    <FileText className="size-8 text-muted-foreground" />
                  </div>
                )}
                <p className="truncate text-sm font-medium">{item.file_name}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
                {item.uploadedBy && (
                  <p className="text-xs text-muted-foreground">
                    {t("activities.evidenceUploadedBy", {
                      name: item.uploadedBy.full_name,
                    })}
                  </p>
                )}
                <Can permission="activities.manageEvidence">
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        />
                      }
                    >
                      {t("common.delete")}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("activities.evidenceDeleteConfirm")}
                        </AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() =>
                            remove.mutate({
                              activityId: activity.id,
                              evidenceId: item.id,
                            })
                          }
                        >
                          {t("common.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </Can>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [tab, setTab] = useState("overview")

  const { data: activity, isLoading } = useGetActivity(id)
  const { data: summary } = useActivitySummary(id)
  const { data: sessions } = useActivitySessions(id)
  const { data: attendances } = useAttendance(id)
  const { data: fines } = useFines()
  const { data: fineTypes } = useFineTypes()
  const { data: members } = useAllMembers()
  const { data: finances } = useSearchFinances({
    page: 1,
    activityId: id,
    scope: "all",
  })
  const changeStatus = useChangeActivityStatus()

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>
  if (!activity) {
    return <p className="text-muted-foreground">{t("activities.noActivities")}</p>
  }

  const activityFines = (fines ?? []).filter((f) => f.activity_id === activity.id)
  const pendingFines = activityFines.filter((f) => f.status === "pending")
  const attendanceByMember = new Map(
    (attendances ?? []).map((a) => [a.member_id, a]),
  )
  const absentWithoutRecord = (summary?.membersCount ?? 0) - (attendances?.length ?? 0)

  const onStatus = async (status: Activity["status"]) => {
    try {
      await changeStatus.mutateAsync({ id: activity.id, status })
      toast.success(t("common.saved"))
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/actividades")}
          >
            <ArrowLeft className="mr-2 size-4" />
            {t("activities.backToList")}
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{activity.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={STATUS_VARIANT[activity.status ?? "draft"]}>
              {t(`activities.statuses.${activity.status ?? "draft"}`)}
            </Badge>
            <span>
              {formatDate(activity.date)} · {activity.start_time} - {activity.end_time}
            </span>
            {activity.type && <Badge variant="outline">{activity.type.name}</Badge>}
            {activity.location && <span>📍 {activity.location}</span>}
          </div>
        </div>

        <Can permission="activities.update">
          <div className="flex flex-wrap items-center gap-2">
            {(activity.status === "draft" || activity.status === "scheduled") && (
              <Button size="sm" onClick={() => onStatus("in_progress")}>
                <Play className="mr-2 size-4" />
                {t("activities.startActivity")}
              </Button>
            )}
            {activity.status === "in_progress" && (
              <Button size="sm" onClick={() => onStatus("completed")}>
                <CheckCircle2 className="mr-2 size-4" />
                {t("activities.completeActivity")}
              </Button>
            )}
            {(activity.status === "scheduled" || activity.status === "in_progress") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatus("cancelled")}
              >
                <Ban className="mr-2 size-4" />
                {t("activities.cancelActivity")}
              </Button>
            )}
          </div>
        </Can>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("activities.tabOverview")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("activities.tabAttendance")}</TabsTrigger>
          <TabsTrigger value="fines">{t("activities.tabFines")}</TabsTrigger>
          <TabsTrigger value="finances">{t("activities.tabFinances")}</TabsTrigger>
          <TabsTrigger value="evidence">{t("activities.tabEvidence")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("activities.totalMembers")} value={summary?.membersCount ?? 0} />
            <StatCard label={t("activities.resultPresent")} value={summary?.attendance.present ?? 0} />
            <StatCard label={t("activities.finesPending")} value={summary?.fines.pending ?? 0} />
            <StatCard
              label={t("activities.financeNet")}
              value={`${summary?.finance.net ?? "0.00"} BOB`}
            />
          </div>

          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">{t("activities.type")}</p>
                <p>{activity.type?.name ?? t("activities.noType")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("activities.location")}</p>
                <p>{activity.location || t("activities.notSet")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("activities.responsible")}</p>
                <p>{activity.responsibleUser?.full_name ?? t("activities.noResponsible")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("activities.collector")}</p>
                <p>{activity.collectorUser?.full_name ?? t("activities.noCollector")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("activities.createdBy", { name: activity.creator?.full_name ?? "—" })}</p>
                <p>{new Date(activity.created_at).toLocaleString()}</p>
              </div>
              {activity.description && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">{t("common.description")}</p>
                  <p>{activity.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="font-medium">{t("activities.sessions")}</h3>
              {!sessions?.length ? (
                <p className="text-sm text-muted-foreground">{t("activities.controlNotSaved")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["initial", "final"] as const).map((kind) => {
                    const session = sessions.find((s) => s.type === kind)
                    return (
                      <div key={kind} className="rounded-md border p-3">
                        <p className="text-sm font-medium">
                          {kind === "initial"
                            ? t("activities.sessionInitial")
                            : t("activities.sessionFinal")}
                        </p>
                        {session ? (
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.started_at ?? new Date().toISOString()).toLocaleString()}
                          </p>
                        ) : (
                          <Badge variant="secondary" className="mt-1">
                            {t("activities.sessionPending")}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("activities.attendanceSummary")}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/actividades/${activity.id}/asistencia`)}
            >
              <Users className="mr-2 size-4" />
              {t("activities.goToAttendance")}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label={t("activities.resultPresent")} value={summary?.attendance.present ?? 0} />
            <StatCard label={t("activities.resultLate")} value={summary?.attendance.late ?? 0} />
            <StatCard label={t("activities.resultLeftEarly")} value={summary?.attendance.leftEarly ?? 0} />
            <StatCard label={t("activities.resultAbsent")} value={summary?.attendance.absent ?? 0} />
            <StatCard label={t("activities.resultExcused")} value={summary?.attendance.excused ?? 0} />
            <StatCard
              label={t("activities.notRegistered")}
              value={Math.max(absentWithoutRecord, 0)}
            />
          </div>

          {attendances?.length ? (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {attendances.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 p-3"
                    >
                      <span>
                        {a.member?.first_name} {a.member?.last_name}
                      </span>
                      <Badge variant={RESULT_VARIANT[a.result ?? "pending"]}>
                        {a.result
                          ? t(`activities.result${a.result.charAt(0).toUpperCase()}${a.result.slice(1)}`)
                          : t("activities.resultPending")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="fines" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{t("activities.finesTitle")}</h2>
            <Can permission="activities.manageFines">
              <ManualFineDialog
                activityId={activity.id}
                fineTypes={(fineTypes ?? []).filter((ft) => ft.is_active && ft.applies_to === "manual")}
                members={(members ?? []).map(
                  (m) => ({
                    id: m.id,
                    label: `${m.first_name} ${m.last_name}`,
                    result: attendanceByMember.get(m.id)?.result ?? null,
                  }),
                )}
              />
            </Can>
          </div>

          {!activityFines.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CircleDollarSign className="mb-3 size-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t("activities.noFines")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {activityFines.map((f: Fine) => (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {f.member?.first_name} {f.member?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {f.fineType?.name} ·{" "}
                          {t(SOURCE_KEY[f.source] ?? "activities.sourceOther")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{f.amount} BOB</span>
                        <Badge variant={f.status === "paid" ? "default" : "outline"}>
                          {t(`activities.${f.status}`)}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="finances" className="space-y-4">
          <h2 className="text-lg font-semibold">{t("activities.financeOfActivity")}</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label={t("activities.financeIncome")} value={`${summary?.finance.income ?? "0.00"} BOB`} />
            <StatCard label={t("activities.financeExpense")} value={`${summary?.finance.expense ?? "0.00"} BOB`} />
            <StatCard label={t("activities.financeNet")} value={`${summary?.finance.net ?? "0.00"} BOB`} />
            <StatCard label={t("activities.financeMovements")} value={summary?.finance.movements ?? 0} />
          </div>

          {!finances?.items.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <ClipboardList className="mb-3 size-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t("activities.noFinanceMovements")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {finances.items.map((ft) => (
                    <li
                      key={ft.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <div>
                        <p className="font-medium">{ft.concept}</p>
                        <p className="text-sm text-muted-foreground">{ft.date}</p>
                      </div>
                      <span
                        className={`font-semibold ${ft.type === "income" ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {ft.type === "income" ? "+" : "-"} {ft.amount} BOB
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidence">
          <EvidenceTab activity={activity} />
        </TabsContent>

      </Tabs>

      {hasPermission("activities.read") ? null : null}
    </div>
  )
}

function ManualFineDialog({
  activityId,
  fineTypes,
  members,
}: {
  activityId: string
  fineTypes: { id: string; name: string; amount: string }[]
  members: { id: string; label: string; result: AttendanceResult | null }[]
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [memberId, setMemberId] = useState<string>("")
  const [fineTypeId, setFineTypeId] = useState<string>("")
  const [notes, setNotes] = useState("")
  const create = useCreateManualFine()

  const submit = async () => {
    try {
      await create.mutateAsync({
        activityId,
        memberId,
        fineTypeId,
        notes: notes || undefined,
      })
      toast.success(t("activities.manualFineCreated"))
      setOpen(false)
      setMemberId("")
      setFineTypeId("")
      setNotes("")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" disabled={!fineTypes.length} />
        }
      >
        <CircleDollarSign className="mr-2 size-4" />
        {t("activities.manualFine")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("activities.manualFineTitle")}</DialogTitle>
        </DialogHeader>
        {!fineTypes.length ? (
          <p className="text-sm text-muted-foreground">
            {t("activities.noManualFineTypes")}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("activities.manualFineMember")}</Label>
              <Select
                value={memberId}
                onValueChange={(v) => setMemberId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                      {m.result ? ` · ${m.result}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("activities.manualFineType")}</Label>
              <Select
                value={fineTypeId}
                onValueChange={(v) => setFineTypeId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  {fineTypes.map((ft) => (
                    <SelectItem key={ft.id} value={ft.id}>
                      {ft.name} ({ft.amount} BOB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("activities.manualFineNotes")}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={submit}
                disabled={!memberId || !fineTypeId || create.isPending}
              >
                {create.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}