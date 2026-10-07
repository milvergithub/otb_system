import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  UserX,
  XCircle,
} from "lucide-react"
import {
  useGetActivity,
  useActivityAttendance,
  useSaveInitialControl,
  useSaveFinalControl,
} from "@/hooks/activities"
import { useAllMembers } from "@/hooks/members"
import { useAuth } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api"
import type { Attendance, AttendanceStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
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
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"

interface MemberOption {
  id: string
  firstName: string
  lastName: string
  ci: string
}

type PresenceField = "present_at_start" | "present_at_end"

function memberInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function presenceKey(
  members: MemberOption[],
  attendanceMap: Map<string, Attendance>,
  field: PresenceField,
): string {
  return members
    .map((m) => `${m.id}:${attendanceMap.get(m.id)?.[field] ? 1 : 0}`)
    .join("|")
}

const RESULT_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  present: { label: "activities.resultPresent", variant: "default" },
  late: { label: "activities.resultLate", variant: "outline" },
  left_early: { label: "activities.resultLeftEarly", variant: "outline" },
  absent: { label: "activities.resultAbsent", variant: "destructive" },
  excused: { label: "activities.resultExcused", variant: "secondary" },
  pending: { label: "activities.resultPending", variant: "secondary" },
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }
> = {
  present: { label: "status.present", variant: "default", icon: CheckCircle },
  absent_start: { label: "status.absentStart", variant: "outline", icon: Clock },
  absent_end: { label: "status.absentEnd", variant: "outline", icon: Clock },
  absent_both: { label: "status.absentBoth", variant: "destructive", icon: UserX },
}

function ControlSection({
  members,
  attendanceMap,
  field,
  controlAt,
  locked,
  lockedHint,
  title,
  description,
  saveLabel,
  confirmBody,
  isSaving,
  onSave,
}: {
  members: MemberOption[]
  attendanceMap: Map<string, Attendance>
  field: PresenceField
  controlAt: string | null
  locked: boolean
  lockedHint?: string
  title: string
  description: string
  saveLabel: string
  confirmBody: (present: number, absent: number) => string
  isSaving: boolean
  onSave: (memberIds: string[]) => void
}) {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission("activities.create")
  const [selected, setSelected] = useState<Set<string>>(() => {
    const next = new Set<string>()
    for (const m of members) {
      if (attendanceMap.get(m.id)?.[field]) next.add(m.id)
    }
    return next
  })
  const [search, setSearch] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  const filtered = useMemo(() => {
    if (!debouncedSearch) return members
    const q = debouncedSearch.toLowerCase()
    return members.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.ci.toLowerCase().includes(q),
    )
  }, [members, debouncedSearch])

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selected.has(m.id))

  const toggleSelect = (memberId: string) => {
    if (locked) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (locked) return
    setSelected((prev) => {
      const ids = filtered.map((m) => m.id)
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id))
      if (allSelected) {
        return new Set([...prev].filter((id) => !ids.includes(id)))
      }
      return new Set([...prev, ...ids])
    })
  }

  const clearSelection = () => {
    if (locked) return
    setSelected(new Set())
  }

  const present = selected.size
  const absent = members.length - present

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              {title}
              {controlAt ? (
                <Badge variant="default">
                  {t("activities.controlSavedAt", {
                    date: new Date(controlAt).toLocaleString(),
                  })}
                </Badge>
              ) : (
                <Badge variant="secondary">{t("activities.controlPending")}</Badge>
              )}
              {locked && <Badge variant="destructive">{t("activities.locked")}</Badge>}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {locked && lockedHint && (
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3">
            {lockedHint}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="flex-1 min-w-[200px] max-w-sm"
            placeholder={t("activities.searchMembers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={locked}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={allFilteredSelected}
              onCheckedChange={toggleSelectAll}
              disabled={locked || filtered.length === 0}
            />
            {t("activities.selectAll")}
          </label>
        </div>

        {!locked && canCreate && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <span className="text-sm font-medium">
              {t("activities.selected", { count: present })}
            </span>
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-1 size-4" />
              )}
              {saveLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              {t("common.cancel")}
            </Button>
          </div>
        )}

        <VirtualTable
          data={filtered}
          estimateSize={48}
          emptyMessage={t("common.noData")}
          renderHeader={() => (
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={locked || filtered.length === 0}
                />
              </TableHead>
              <TableHead>{t("activities.memberName")}</TableHead>
              <TableHead className="w-32 text-center">{t("activities.colControl")}</TableHead>
            </TableRow>
          )}
          renderRow={(row) => {
            const presentValue = attendanceMap.get(row.id)?.[field] === true
            return (
              <>
                <td className="p-2">
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={() => toggleSelect(row.id)}
                    disabled={locked}
                  />
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {memberInitials(row.firstName, row.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium">
                        {row.lastName}, {row.firstName}
                      </span>
                      <Badge
                        variant="secondary"
                        className="w-fit gap-0 text-[10px] font-semibold px-1.5 py-0"
                      >
                        {row.ci}
                      </Badge>
                    </div>
                  </div>
                </td>
                <td className="p-2 text-center">
                  {presentValue ? (
                    <Badge variant="default">{t("activities.present")}</Badge>
                  ) : (
                    <Badge variant="outline">{t("activities.controlNotSaved")}</Badge>
                  )}
                </td>
              </>
            )
          }}
        />

        <AlertDialog open={confirmOpen} onOpenChange={() => setConfirmOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("activities.controlConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmBody(present, absent)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmOpen(false)
                  onSave([...selected])
                }}
              >
                {t("activities.confirmSaveControl")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export default function AttendancePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()

  const { data: activity } = useGetActivity(id)
  const { data: attendances, isLoading: loadingAtt } = useActivityAttendance(id)
  const { data: allMembers, isLoading: loadingMembers } = useAllMembers()
  const initialMut = useSaveInitialControl()
  const finalMut = useSaveFinalControl()

  const attendanceMap = useMemo(
    () => new Map((attendances ?? []).map((a) => [a.member_id, a])),
    [attendances],
  )

  const members: MemberOption[] = useMemo(() => {
    const list = (allMembers ?? []).map((m) => ({
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      ci: m.ci,
    }))
    return list.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
    )
  }, [allMembers])

  const hasInitial = !!activity?.initial_control_at
  const hasFinal = !!activity?.final_control_at

  const stats = useMemo(() => {
    let presentAtStart = 0
    let presentAtEnd = 0
    let withFine = 0
    let withoutFine = 0
    for (const m of members) {
      const att = attendanceMap.get(m.id)
      if (!att) continue
      if (att.present_at_start) presentAtStart++
      if (att.present_at_end) presentAtEnd++
      if (att.status === "present") withoutFine++
      else withFine++
    }
    return { presentAtStart, presentAtEnd, withFine, withoutFine }
  }, [members, attendanceMap])

  const initialKey = useMemo(
    () => presenceKey(members, attendanceMap, "present_at_start"),
    [members, attendanceMap],
  )

  const finalKey = useMemo(
    () => presenceKey(members, attendanceMap, "present_at_end"),
    [members, attendanceMap],
  )

  const handleSaveInitial = async (memberIds: string[]) => {
    if (!id) return
    try {
      const res = await initialMut.mutateAsync({ activityId: id, memberIds })
      toast.success(
        t("activities.initialControlSaved", {
          present: res.presentAtStart,
          absent: res.absentAtStart,
        }),
      )
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  const handleSaveFinal = async (memberIds: string[]) => {
    if (!id) return
    try {
      const res = await finalMut.mutateAsync({ activityId: id, memberIds })
      toast.success(
        t("activities.finalControlSaved", {
          present: res.presentAtEnd,
          absent: res.absentAtEnd,
          fines: res.finesGenerated,
        }),
      )
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  const isLoading = loadingAtt || loadingMembers

  if (!hasPermission("activities.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("common.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/actividades/${id}`)}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{activity?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {activity && formatDate(activity.date)} &middot;{" "}
            {activity?.start_time} - {activity?.end_time}
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{members.length}</div>
            <div className="text-xs text-muted-foreground">{t("activities.totalMembers")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className={cn("text-xl font-bold", stats.presentAtStart > 0 && "text-green-600")}>
              {stats.presentAtStart}
            </div>
            <div className="text-xs text-muted-foreground">{t("activities.presentAtStart")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className={cn("text-xl font-bold", stats.presentAtEnd > 0 && "text-green-600")}>
              {stats.presentAtEnd}
            </div>
            <div className="text-xs text-muted-foreground">{t("activities.presentAtEnd")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-red-600">
              {hasFinal ? stats.withFine : "-"}
            </div>
            <div className="text-xs text-muted-foreground">{t("activities.withFine")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-green-600">
              {hasFinal ? stats.withoutFine : "-"}
            </div>
            <div className="text-xs text-muted-foreground">{t("activities.withoutFine")}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <Tabs defaultValue={hasFinal ? "summary" : "initial"}>
          <TabsList>
            <TabsTrigger value="initial">{t("activities.initialControl")}</TabsTrigger>
            <TabsTrigger value="final">{t("activities.finalControl")}</TabsTrigger>
            {hasFinal && <TabsTrigger value="summary">{t("activities.summary")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="initial" className="space-y-4">
            <ControlSection
              key={initialKey}
              members={members}
              attendanceMap={attendanceMap}
              field="present_at_start"
              controlAt={activity?.initial_control_at ?? null}
              locked={hasFinal}
              lockedHint={t("activities.initialLockedHint")}
              title={t("activities.initialControl")}
              description={t("activities.initialControlDesc")}
              saveLabel={t("activities.saveInitialControl")}
              confirmBody={(present, absent) =>
                t("activities.initialControlConfirm", { present, absent })
              }
              isSaving={initialMut.isPending}
              onSave={handleSaveInitial}
            />
          </TabsContent>

          <TabsContent value="final" className="space-y-4">
            <ControlSection
              key={finalKey}
              members={members}
              attendanceMap={attendanceMap}
              field="present_at_end"
              controlAt={activity?.final_control_at ?? null}
              locked={!hasInitial}
              lockedHint={!hasInitial ? t("activities.finalNeedsInitialHint") : undefined}
              title={t("activities.finalControl")}
              description={t("activities.finalControlDesc")}
              saveLabel={t("activities.saveFinalControl")}
              confirmBody={(present, absent) =>
                t("activities.finalControlConfirm", { present, absent })
              }
              isSaving={finalMut.isPending}
              onSave={handleSaveFinal}
            />
          </TabsContent>

          {hasFinal && (
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-base font-semibold mb-4">{t("activities.summaryTitle")}</h3>
                  <VirtualTable
                    data={members}
                    estimateSize={48}
                    emptyMessage={t("common.noData")}
                    renderHeader={() => (
                      <TableRow>
                        <TableHead>{t("activities.memberName")}</TableHead>
                        <TableHead className="text-center">{t("activities.colControlStart")}</TableHead>
                        <TableHead className="text-center">{t("activities.colControlEnd")}</TableHead>
                        <TableHead className="text-center">{t("activities.status")}</TableHead>
                        <TableHead className="text-center">{t("activities.result")}</TableHead>
                      </TableRow>
                    )}
                    renderRow={(row) => {
                      const att = attendanceMap.get(row.id)
                      const presenceStart = att?.present_at_start ?? false
                      const presenceEnd = att?.present_at_end ?? false
                      const cfg = STATUS_CONFIG[att?.status ?? "absent_both"]
                      const Icon = cfg.icon
                      return (
                        <>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="size-8">
                                <AvatarFallback className="text-xs">
                                  {memberInitials(row.firstName, row.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col leading-tight">
                                <span className="font-medium">
                                  {row.lastName}, {row.firstName}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="w-fit gap-0 text-[10px] font-semibold px-1.5 py-0"
                                >
                                  {row.ci}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={presenceStart ? "default" : "destructive"}>
                              {presenceStart ? t("activities.present") : t("activities.absent")}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={presenceEnd ? "default" : "destructive"}>
                              {presenceEnd ? t("activities.present") : t("activities.absent")}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={cfg.variant} className="text-xs">
                              <Icon className="mr-1 size-3" />
                              {t(cfg.label)}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Badge
                              variant={(RESULT_CONFIG[att?.result ?? "pending"] ?? RESULT_CONFIG.pending).variant}
                              className="text-xs"
                            >
                              {t(
                                (
                                  RESULT_CONFIG[att?.result ?? "pending"] ??
                                  RESULT_CONFIG.pending
                                ).label,
                              )}
                            </Badge>
                          </td>
                        </>
                      )
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}