import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Download,
  FileText,
  Pause,
  Play,
  Plus,
  Search,
  Wallet,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api"
import {
  useAddContributionMembers,
  useCancelObligation,
  useChangeContributionStatus,
  useContributionDocuments,
  useContributionFinances,
  useContributionObligations,
  useContributionPayments,
  useContributionSummary,
  useExonerateObligation,
  useGetContribution,
  usePayContribution,
  useVoidContributionPayment,
  downloadContributionPaymentReceipt,
  downloadContributionRendition,
} from "@/hooks/contributions"
import type {
  ContributionObligation,
  ContributionObligationStatus,
  ContributionPayment,
  Member,
  MemberType,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { useSearchMembers } from "@/hooks/members"
import { usePaymentMethodMap, usePaymentMethods } from "@/hooks/paymentMethods"

const OBLIGATION_STATUS_BADGE: Record<
  ContributionObligationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  partial: "outline",
  paid: "default",
  exonerated: "outline",
  cancelled: "destructive",
}

export default function ContributionDetailPage() {
  const { id = "" } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission, user } = useAuth()

  const { data: contribution, isLoading } = useGetContribution(id)
  const { data: summary } = useContributionSummary(id)

  const [obligationPage, setObligationPage] = useState(1)
  const [obligationSearch, setObligationSearch] = useState("")
  const [obligationStatus, setObligationStatus] = useState<
    ContributionObligationStatus | ""
  >("")
  const { data: obligations } = useContributionObligations(id, {
    page: obligationPage,
    search: obligationSearch,
    status: obligationStatus,
  })

  const [paymentPage, setPaymentPage] = useState(1)
  const [paymentStatus, setPaymentStatus] = useState<
    "active" | "voided" | ""
  >("")
  const { data: payments } = useContributionPayments(id, {
    page: paymentPage,
    status: paymentStatus,
  })

  const [financePage, setFinancePage] = useState(1)
  const { data: finances } = useContributionFinances(id, financePage)
  const { data: documents } = useContributionDocuments(id)

  const statusMutation = useChangeContributionStatus()
  const addMembersMutation = useAddContributionMembers()
  const exonerateMutation = useExonerateObligation()
  const cancelObligationMutation = useCancelObligation()
  const payMutation = usePayContribution()
  const { data: paymentMethods } = usePaymentMethods()
  const { map: methodNames } = usePaymentMethodMap()
  const voidMutation = useVoidContributionPayment()

  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [allActive, setAllActive] = useState(true)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [memberSearch, setMemberSearch] = useState("")
  const { data: membersData } = useSearchMembers({
    page: 1,
    search: memberSearch,
  })

  const [paying, setPaying] = useState<ContributionObligation | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("")
  const [payReference, setPayReference] = useState("")
  const [payEvidence, setPayEvidence] = useState<{
    base64: string
    name: string
  } | null>(null)

  const [exonerating, setExonerating] = useState<ContributionObligation | null>(
    null,
  )
  const [exonerateReason, setExonerateReason] = useState("")
  const [cancellingObligation, setCancellingObligation] =
    useState<ContributionObligation | null>(null)
  const [cancelObligationReason, setCancelObligationReason] = useState("")

  const [voiding, setVoiding] = useState<ContributionPayment | null>(null)
  const [voidReason, setVoidReason] = useState("")
  const [cancellingCampaign, setCancellingCampaign] = useState(false)
  const [cancelCampaignReason, setCancelCampaignReason] = useState("")

  const canManage =
    !!contribution &&
    (hasPermission("contributions.all") ||
      hasPermission("contributions.update") ||
      contribution.created_by === user?.id ||
      contribution.responsible_user_id === user?.id)
  const isDraft = contribution?.status === "draft"
  const isActive = contribution?.status === "active"
  const isPaused = contribution?.status === "paused"
  const isTerminal =
    contribution?.status === "completed" ||
    contribution?.status === "cancelled"

  const changeStatus = (
    action: "activate" | "pause" | "complete" | "cancel",
    reason?: string,
  ) => {
    statusMutation.mutate(
      { id, action, reason },
      {
        onSuccess: () => toast.success(t("common.saved")),
        onError: (error) => toast.error(getApiErrorMessage(error)),
      },
    )
  }

  const openPay = (obligation: ContributionObligation) => {
    const pending = Math.max(
      0,
      Number(obligation.amount),
    )
    setPaying(obligation)
    setPayAmount(pending.toFixed(2))
    setPayMethod("")
    setPayReference("")
    setPayEvidence(null)
  }

  const onPaySubmit = () => {
    if (!paying) return
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("contributions.amountPositive"))
      return
    }
    payMutation.mutate(
      {
        id,
        obligationId: paying.id,
        amount,
        paymentMethod: payMethod || undefined,
        reference: payReference || undefined,
        evidenceBase64: payEvidence?.base64,
        evidenceFileName: payEvidence?.name,
      },
      {
        onSuccess: () => {
          toast.success(t("contributions.paymentSaved"))
          setPaying(null)
        },
        onError: (error) => toast.error(getApiErrorMessage(error)),
      },
    )
  }

  const onEvidenceChange = (file: File | undefined) => {
    if (!file) {
      setPayEvidence(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () =>
      setPayEvidence({ base64: String(reader.result), name: file.name })
    reader.readAsDataURL(file)
  }

  const groupedMembers = useMemo(() => {
    const groups = new Map<
      string,
      { type: MemberType | null; members: Member[] }
    >()
    for (const m of membersData?.items ?? []) {
      const key = m.member_type?.id ?? "none"
      const group = groups.get(key)
      if (group) {
        group.members.push(m)
      } else {
        groups.set(key, { type: m.member_type ?? null, members: [m] })
      }
    }
    return [...groups.values()].sort((a, b) => {
      if (!a.type) return 1
      if (!b.type) return -1
      return (
        a.type.sort_order - b.type.sort_order ||
        a.type.name.localeCompare(b.type.name)
      )
    })
  }, [membersData])

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((m) => m !== memberId)
        : [...prev, memberId],
    )
  }

  function toggleGroup(members: Member[]) {
    const ids = members.map((m) => m.id)
    const allSelected = ids.every((id) => selectedMemberIds.includes(id))
    setSelectedMemberIds((prev) =>
      allSelected
        ? prev.filter((id) => !ids.includes(id))
        : [...new Set([...prev, ...ids])],
    )
  }

  const obligationColumns: DataTableColumn<ContributionObligation>[] = [
    {
      key: "member",
      label: t("contributions.fields.member"),
      render: (o) =>
        o.member ? `${o.member.first_name} ${o.member.last_name}` : "-",
    },
    {
      key: "amount",
      label: t("contributions.fields.amount"),
      render: (o) => `${Number(o.amount).toFixed(2)} Bs`,
    },
    {
      key: "status",
      label: t("contributions.fields.status"),
      render: (o) => (
        <Badge variant={OBLIGATION_STATUS_BADGE[o.status]}>
          {t(`contributions.obligationStatuses.${o.status}`)}
        </Badge>
      ),
    },
    {
      key: "exonerated_reason",
      label: t("contributions.fields.reason"),
      render: (o) => o.exonerated_reason ?? o.cancel_reason ?? "-",
    },
    {
      key: "actions",
      label: "",
      stickyRight: true,
      className: "w-48",
      render: (o) => obligationActions(o),
    },
  ]

  const obligationActions = (o: ContributionObligation) => {
    const chargeable =
      isActive &&
      o.status !== "paid" &&
      o.status !== "exonerated" &&
      o.status !== "cancelled"
    return (
      <div className="flex items-center gap-1 justify-end">
        {chargeable && hasPermission("contributions.collect") ? (
          <Button size="sm" onClick={() => openPay(o)}>
            <Wallet className="mr-1 size-4" />
            {t("contributions.pay")}
          </Button>
        ) : null}
        {canManage &&
        (o.status === "pending" || o.status === "partial") &&
        hasPermission("contributions.exonerate") ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setExonerating(o)
              setExonerateReason("")
            }}
          >
            {t("contributions.exonerate")}
          </Button>
        ) : null}
        {canManage && o.status === "pending" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCancellingObligation(o)
              setCancelObligationReason("")
            }}
          >
            <Ban className="size-4" />
          </Button>
        ) : null}
      </div>
    )
  }

  const paymentColumns: DataTableColumn<ContributionPayment>[] = [
    {
      key: "member",
      label: t("contributions.fields.member"),
      render: (p) =>
        p.member
          ? `${p.member.first_name} ${p.member.last_name}`
          : p.obligation?.member
            ? `${p.obligation.member.first_name} ${p.obligation.member.last_name}`
            : "-",
    },
    {
      key: "amount",
      label: t("contributions.fields.amount"),
      render: (p) => `${Number(p.amount).toFixed(2)} Bs`,
    },
    {
      key: "paid_at",
      label: t("contributions.fields.paidAt"),
      render: (p) => new Date(p.paid_at).toLocaleDateString("es-BO"),
    },
    {
      key: "payment_method",
      label: t("contributions.fields.method"),
      render: (p) =>
        p.payment_method
          ? (methodNames[p.payment_method] ?? p.payment_method)
          : "-",
    },
    {
      key: "status",
      label: t("contributions.fields.status"),
      render: (p) => (
        <Badge variant={p.status === "voided" ? "destructive" : "default"}>
          {t(`contributions.paymentStatuses.${p.status}`)}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      stickyRight: true,
      className: "w-24",
      render: (p) => paymentActions(p),
    },
  ]

  const paymentActions = (p: ContributionPayment) => (
    <div className="flex items-center gap-1 justify-end">
      <Button
        size="sm"
        variant="ghost"
        onClick={() =>
          void downloadContributionPaymentReceipt(id, p.id).catch((error) =>
            toast.error(getApiErrorMessage(error)),
          )
        }
      >
        <Download className="size-4" />
      </Button>
      {p.status === "active" && hasPermission("contributions.void") ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setVoiding(p)
            setVoidReason("")
          }}
        >
          <XCircle className="size-4" />
        </Button>
      ) : null}
    </div>
  )

  if (isLoading || !contribution) {
    return <div className="p-6">{t("common.loading")}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/contributions")}
          >
            <ArrowLeft className="mr-2 size-4" />
            {t("contributions.back")}
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {contribution.title}
          </h1>
          {contribution.purpose ? (
            <p className="text-muted-foreground">{contribution.purpose}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <Badge>{t(`contributions.statuses.${contribution.status}`)}</Badge>
            <span className="text-sm text-muted-foreground">
              {Number(contribution.amount_per_member).toFixed(2)} Bs /{" "}
              {t("contributions.perMember")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && isDraft ? (
            <Button
              onClick={() => changeStatus("activate")}
              disabled={statusMutation.isPending}
            >
              <Play className="mr-2 size-4" />
              {t("contributions.activate")}
            </Button>
          ) : null}
          {canManage && isActive ? (
            <Button
              variant="outline"
              onClick={() => changeStatus("pause")}
              disabled={statusMutation.isPending}
            >
              <Pause className="mr-2 size-4" />
              {t("contributions.pause")}
            </Button>
          ) : null}
          {canManage && (isActive || isPaused) ? (
            <Button
              variant="outline"
              onClick={() => changeStatus("complete")}
              disabled={statusMutation.isPending}
            >
              <CheckCircle2 className="mr-2 size-4" />
              {t("contributions.complete")}
            </Button>
          ) : null}
          {canManage && !isTerminal ? (
            <Button
              variant="destructive"
              onClick={() => {
                setCancellingCampaign(true)
                setCancelCampaignReason("")
              }}
            >
              <Ban className="mr-2 size-4" />
              {t("contributions.cancel")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() =>
              void downloadContributionRendition(id).catch((error) =>
                toast.error(getApiErrorMessage(error)),
              )
            }
          >
            <FileText className="mr-2 size-4" />
            {t("contributions.rendition")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">{t("contributions.tabs.summary")}</TabsTrigger>
          <TabsTrigger value="obligations">
            {t("contributions.tabs.obligations")}
          </TabsTrigger>
          <TabsTrigger value="payments">
            {t("contributions.tabs.payments")}
          </TabsTrigger>
          <TabsTrigger value="finances">
            {t("contributions.tabs.finances")}
          </TabsTrigger>
          <TabsTrigger value="documents">
            {t("contributions.tabs.documents")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">
                  {t("contributions.summary.expected")}
                </div>
                <div className="text-2xl font-bold">
                  {summary
                    ? `${summary.obligations.expectedAmount.toFixed(2)} Bs`
                    : "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">
                  {t("contributions.summary.collected")}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {summary
                    ? `${summary.obligations.collectedAmount.toFixed(2)} Bs`
                    : "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">
                  {t("contributions.summary.pendingRecovery")}
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {summary
                    ? `${summary.obligations.pendingRecoveryAmount.toFixed(2)} Bs`
                    : "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">
                  {t("contributions.summary.balance")}
                </div>
                <div className="text-2xl font-bold">
                  {summary ? `${summary.finance.balance.toFixed(2)} Bs` : "-"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.summary.members")}
                  </span>
                  <span>{summary?.obligations.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.statuses.pending")}
                  </span>
                  <span>{summary?.obligations.pending ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.statuses.partial")}
                  </span>
                  <span>{summary?.obligations.partial ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.statuses.paid")}
                  </span>
                  <span>{summary?.obligations.paid ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.statuses.exonerated")}
                  </span>
                  <span>{summary?.obligations.exonerated ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.statuses.cancelled")}
                  </span>
                  <span>{summary?.obligations.cancelled ?? 0}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.fields.collector")}
                  </span>
                  <span>{contribution.collectorUser?.full_name ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.fields.responsible")}
                  </span>
                  <span>{contribution.responsibleUser?.full_name ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.summary.income")}
                  </span>
                  <span>
                    {summary ? `${summary.finance.income.toFixed(2)} Bs` : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.summary.expenses")}
                  </span>
                  <span>
                    {summary ? `${summary.finance.expenses.toFixed(2)} Bs` : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("contributions.fields.notes")}
                  </span>
                  <span className="text-right max-w-[60%]">
                    {contribution.notes ?? "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="obligations" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("common.search")}
                value={obligationSearch}
                onChange={(e) => {
                  setObligationSearch(e.target.value)
                  setObligationPage(1)
                }}
              />
            </div>
            {canManage && !isTerminal ? (
              <Button onClick={() => setAddMembersOpen(true)}>
                <Plus className="mr-2 size-4" />
                {t("contributions.addMembers")}
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={obligationStatus || "all"}
              onValueChange={(v) => {
                setObligationStatus(
                  v === "all" ? "" : (v as ContributionObligationStatus),
                )
                setObligationPage(1)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("contributions.fields.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("contributions.allStatuses")}
                </SelectItem>
                {(
                  [
                    "pending",
                    "partial",
                    "paid",
                    "exonerated",
                    "cancelled",
                  ] as ContributionObligationStatus[]
                ).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`contributions.obligationStatuses.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable<ContributionObligation>
            columns={obligationColumns}
            data={obligations?.items ?? []}
            emptyText={t("contributions.noObligations")}
            rowKey={(o) => o.id}
          />
          <DataTablePagination
            page={obligationPage}
            totalPages={obligations?.totalPages ?? 1}
            total={obligations?.total ?? 0}
            onPageChange={setObligationPage}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select
              value={paymentStatus || "all"}
              onValueChange={(v) => {
                setPaymentStatus(
                  v === "all" ? "" : (v as "active" | "voided"),
                )
                setPaymentPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("contributions.fields.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("contributions.allStatuses")}
                </SelectItem>
                <SelectItem value="active">
                  {t("contributions.paymentStatuses.active")}
                </SelectItem>
                <SelectItem value="voided">
                  {t("contributions.paymentStatuses.voided")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable<ContributionPayment>
            columns={paymentColumns}
            data={payments?.items ?? []}
            emptyText={t("contributions.noPayments")}
            rowKey={(p) => p.id}
          />
          <DataTablePagination
            page={paymentPage}
            totalPages={payments?.totalPages ?? 1}
            total={payments?.total ?? 0}
            onPageChange={setPaymentPage}
          />
        </TabsContent>

        <TabsContent value="finances" className="space-y-4">
          <DataTable
            columns={[
              {
                key: "date",
                label: t("contributions.fields.date"),
                render: (tx) =>
                  new Date(tx.date).toLocaleDateString("es-BO"),
              },
              {
                key: "concept",
                label: t("contributions.fields.concept"),
                render: (tx) => tx.concept,
              },
              {
                key: "type",
                label: t("contributions.fields.type"),
                render: (tx) =>
                  t(`finances.types.${tx.type}`, {
                    defaultValue: tx.type,
                  }),
              },
              {
                key: "amount",
                label: t("contributions.fields.amount"),
                render: (tx) => `${Number(tx.amount).toFixed(2)} Bs`,
              },
              {
                key: "status",
                label: t("contributions.fields.status"),
                render: (tx) => (
                  <Badge
                    variant={tx.status === "voided" ? "destructive" : "default"}
                  >
                    {tx.status}
                  </Badge>
                ),
              },
            ]}
            data={finances?.items ?? []}
            emptyText={t("contributions.noFinances")}
            rowKey={(tx) => tx.id}
          />
          <DataTablePagination
            page={financePage}
            totalPages={finances?.totalPages ?? 1}
            total={finances?.total ?? 0}
            onPageChange={setFinancePage}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {(documents?.paymentEvidence?.length ?? 0) === 0 &&
          (documents?.financeDocuments?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">
              {t("contributions.noDocuments")}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(documents?.paymentEvidence ?? []).map((doc) => (
                <Card key={doc.paymentId}>
                  <CardContent className="pt-6 space-y-2">
                    <div className="text-sm font-medium">
                      {t("contributions.evidence")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {doc.memberName ?? "-"} ·{" "}
                      {new Date(doc.paidAt).toLocaleDateString("es-BO")}
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline"
                    >
                      {t("common.view")}
                    </a>
                  </CardContent>
                </Card>
              ))}
              {(documents?.financeDocuments ?? []).map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="pt-6 space-y-2">
                    <div className="text-sm font-medium">
                      {doc.file_name || t("contributions.document")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {doc.kind}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add members dialog */}
      <Dialog open={addMembersOpen} onOpenChange={setAddMembersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("contributions.addMembers")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allActive}
                  onChange={(e) => setAllActive(e.target.checked)}
                />
                {t("contributions.allMembers")}
              </Label>
            </div>
            {!allActive ? (
              <div className="space-y-2">
                <Input
                  placeholder={t("common.search")}
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-2">
                  {groupedMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("common.noResults")}
                    </p>
                  ) : (
                    groupedMembers.map((group) => {
                      const groupIds = group.members.map((m) => m.id)
                      const selectedInGroup = groupIds.filter((id) =>
                        selectedMemberIds.includes(id),
                      )
                      const allGroupSelected =
                        groupIds.length > 0 &&
                        selectedInGroup.length === groupIds.length
                      const someGroupSelected =
                        selectedInGroup.length > 0 && !allGroupSelected
                      return (
                        <div key={group.type?.id ?? "none"} className="space-y-1">
                          <div className="flex items-center gap-2 border-b pb-1">
                            <input
                              type="checkbox"
                              ref={(el) => {
                                if (el) el.indeterminate = someGroupSelected
                              }}
                              checked={allGroupSelected}
                              onChange={() => toggleGroup(group.members)}
                              aria-label={t("common.selectAll")}
                            />
                            <span className="text-xs font-semibold uppercase text-muted-foreground">
                              {group.type?.name ?? t("memberTypes.noType")}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                              {selectedInGroup.length}/{groupIds.length}
                            </span>
                          </div>
                          {group.members.map((member) => (
                            <label
                              key={member.id}
                              className="flex items-center gap-2 pl-6 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedMemberIds.includes(member.id)}
                                onChange={() => toggleMember(member.id)}
                              />
                              {member.first_name} {member.last_name}
                            </label>
                          ))}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMembersOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() =>
                addMembersMutation.mutate(
                  {
                    id,
                    allActive: allActive || undefined,
                    memberIds: allActive ? undefined : selectedMemberIds,
                  },
                  {
                    onSuccess: (result) => {
                      toast.success(
                        t("contributions.membersAdded", {
                          added: result.added,
                        }),
                      )
                      setAddMembersOpen(false)
                    },
                    onError: (error) =>
                      toast.error(getApiErrorMessage(error)),
                  },
                )
              }
              disabled={addMembersMutation.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("contributions.pay")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("contributions.fields.amount")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contributions.fields.method")}</Label>
              <Select
                value={payMethod}
                onValueChange={(v) => setPayMethod(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("contributions.fields.method")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods?.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("contributions.fields.reference")}</Label>
              <Input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contributions.fields.evidence")}</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => onEvidenceChange(e.target.files?.[0])}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onPaySubmit} disabled={payMutation.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exonerate dialog */}
      <Dialog
        open={!!exonerating}
        onOpenChange={(open) => !open && setExonerating(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("contributions.exonerate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("contributions.fields.reason")}</Label>
            <Textarea
              value={exonerateReason}
              onChange={(e) => setExonerateReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExonerating(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!exonerateReason || exonerateMutation.isPending}
              onClick={() => {
                if (!exonerating) return
                exonerateMutation.mutate(
                  {
                    id,
                    obligationId: exonerating.id,
                    reason: exonerateReason,
                  },
                  {
                    onSuccess: () => {
                      toast.success(t("common.saved"))
                      setExonerating(null)
                    },
                    onError: (error) =>
                      toast.error(getApiErrorMessage(error)),
                  },
                )
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel obligation dialog */}
      <Dialog
        open={!!cancellingObligation}
        onOpenChange={(open) => !open && setCancellingObligation(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("contributions.cancelObligation")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("contributions.fields.reason")}</Label>
            <Textarea
              value={cancelObligationReason}
              onChange={(e) => setCancelObligationReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancellingObligation(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={cancelObligationMutation.isPending}
              onClick={() => {
                if (!cancellingObligation) return
                cancelObligationMutation.mutate(
                  {
                    id,
                    obligationId: cancellingObligation.id,
                    reason: cancelObligationReason || undefined,
                  },
                  {
                    onSuccess: () => {
                      toast.success(t("common.saved"))
                      setCancellingObligation(null)
                    },
                    onError: (error) =>
                      toast.error(getApiErrorMessage(error)),
                  },
                )
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void payment dialog */}
      <Dialog
        open={!!voiding}
        onOpenChange={(open) => !open && setVoiding(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("contributions.voidPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("contributions.fields.reason")}</Label>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoiding(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!voidReason || voidMutation.isPending}
              onClick={() => {
                if (!voiding) return
                voidMutation.mutate(
                  { id, paymentId: voiding.id, reason: voidReason },
                  {
                    onSuccess: () => {
                      toast.success(t("common.saved"))
                      setVoiding(null)
                    },
                    onError: (error) =>
                      toast.error(getApiErrorMessage(error)),
                  },
                )
              }}
            >
              {t("contributions.voidPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel campaign dialog */}
      <Dialog
        open={cancellingCampaign}
        onOpenChange={setCancellingCampaign}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("contributions.cancel")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("contributions.fields.reason")}</Label>
            <Textarea
              value={cancelCampaignReason}
              onChange={(e) => setCancelCampaignReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancellingCampaign(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => {
                changeStatus("cancel", cancelCampaignReason || undefined)
                setCancellingCampaign(false)
              }}
            >
              {t("contributions.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete campaign (draft only) */}
    </div>
  )
}
