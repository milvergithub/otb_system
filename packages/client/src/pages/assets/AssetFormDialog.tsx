import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Asset } from "@/lib/types"
import { useAddAsset, useEditAsset, useAssetCategories, useAssetLocations } from "@/hooks/assets"
import { useAllMembers } from "@/hooks/members"
import { useSearchUsers } from "@/hooks/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { ComboboxSelect } from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const assetFormSchema = (t: TFunction) =>
  z
    .object({
      name: requiredString(t),
      description: z.string().optional(),
      categoryId: z.string().optional(),
      locationId: z.string().optional(),
      condition: z.string().optional(),
      quantity: z.string().optional(),
      acquisitionDate: z.string().optional(),
      acquisitionValue: z.string().optional(),
      acquisitionType: z.string().optional(),
      responsibleUserId: z.string().optional(),
      responsibleMemberId: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine(
      (v) => !(v.responsibleUserId && v.responsibleMemberId),
      () => ({ message: t("assets.responsibleSingle"), path: ["responsibleUserId"] }),
    )

type AssetFormValues = z.infer<ReturnType<typeof assetFormSchema>>

const DEFAULT_FORM: AssetFormValues = {
  name: "",
  description: "",
  categoryId: "",
  locationId: "",
  condition: "good",
  quantity: "1",
  acquisitionDate: "",
  acquisitionValue: "",
  acquisitionType: "",
  responsibleUserId: "",
  responsibleMemberId: "",
  notes: "",
}

const ACQUISITION_TYPES = ["purchase", "donation", "transfer", "construction"] as const

interface AssetFormDialogProps {
  open: boolean
  editing: Asset | null
  onOpenChange: (open: boolean) => void
}

export default function AssetFormDialog({ open, editing, onOpenChange }: AssetFormDialogProps) {
  const { t } = useTranslation()
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const { data: categories } = useAssetCategories()
  const { data: locations } = useAssetLocations()
  const { data: members } = useAllMembers()
  const { data: users } = useSearchUsers()

  const addMutation = useAddAsset()
  const editMutation = useEditAsset()

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            name: editing.name,
            description: editing.description ?? "",
            categoryId: editing.category_id ?? "",
            locationId: editing.location_id ?? "",
            condition: editing.condition ?? "good",
            quantity: String(editing.quantity ?? 1),
            acquisitionDate: editing.acquisition_date ?? "",
            acquisitionValue: editing.acquisition_value ?? "",
            acquisitionType: editing.acquisition_type ?? "",
            responsibleUserId: editing.current_responsible_user_id ?? "",
            responsibleMemberId: editing.current_responsible_member_id ?? "",
            notes: editing.notes ?? "",
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        name: values.name.trim(),
        description: values.description || undefined,
        categoryId: values.categoryId || undefined,
        locationId: values.locationId || undefined,
        condition: values.condition || undefined,
        quantity: values.quantity ? Number(values.quantity) : undefined,
        acquisitionDate: values.acquisitionDate || undefined,
        acquisitionValue: values.acquisitionValue ? Number(values.acquisitionValue) : undefined,
        acquisitionType: values.acquisitionType || undefined,
        currentResponsibleUserId: values.responsibleUserId || undefined,
        currentResponsibleMemberId: values.responsibleMemberId || undefined,
        notes: values.notes || undefined,
      }
      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("assets.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("assets.created"))
            onOpenChange(false)
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        })
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("assets.editTitle") : t("assets.newTitle")}</DialogTitle>
          <DialogDescription>
            {editing ? t("assets.editDesc") : t("assets.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("assets.name")}</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("assets.category")}</Label>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[{ label: t("common.all"), value: "" }, ...(categories ?? []).map((c) => ({ label: c.name, value: c.id }))]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("assets.location")}</Label>
              <Controller
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[{ label: t("common.all"), value: "" }, ...(locations ?? []).map((l) => ({ label: l.name, value: l.id }))]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("assets.conditionLabel")}</Label>
              <Controller
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || "good"}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("assets.condition.new"), value: "new" },
                      { label: t("assets.condition.good"), value: "good" },
                      { label: t("assets.condition.fair"), value: "fair" },
                      { label: t("assets.condition.poor"), value: "poor" },
                    ]}
                    placeholder={t("common.select")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">{t("assets.quantity")}</Label>
              <Input id="quantity" type="number" min="1" {...form.register("quantity")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("assets.acquisitionDate")}</Label>
              <Controller
                control={form.control}
                name="acquisitionDate"
                render={({ field }) => (
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acquisitionValue">{t("assets.acquisitionValue")}</Label>
              <Input id="acquisitionValue" type="number" step="0.01" min="0" {...form.register("acquisitionValue")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("assets.acquisitionType")}</Label>
            <Controller
              control={form.control}
              name="acquisitionType"
              render={({ field }) => (
                <ComboboxSelect
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  options={[{ label: t("common.none"), value: "" }, ...ACQUISITION_TYPES.map((x) => ({ label: t(`assets.acquisition.${x}`), value: x }))]}
                  placeholder={t("common.select")}
                />
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("assets.responsibleUser")}</Label>
              <Controller
                control={form.control}
                name="responsibleUserId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[{ label: t("common.none"), value: "" }, ...(users ?? []).map((u) => ({ label: u.full_name, value: u.id }))]}
                    placeholder={t("common.select")}
                  />
                )}
              />
              {form.formState.errors.responsibleUserId && (
                <p className="text-sm text-destructive">{form.formState.errors.responsibleUserId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("assets.responsibleMember")}</Label>
              <Controller
                control={form.control}
                name="responsibleMemberId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[{ label: t("common.none"), value: "" }, ...(members ?? []).map((m) => ({ label: `${m.first_name} ${m.last_name}`, value: m.id }))]}
                    placeholder={t("common.select")}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("assets.description")}</Label>
            <Textarea id="description" rows={2} {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("assets.notes")}</Label>
            <Textarea id="notes" rows={2} {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={addMutation.isPending || editMutation.isPending}>
              {addMutation.isPending || editMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
