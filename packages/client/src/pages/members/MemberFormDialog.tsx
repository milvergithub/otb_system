import { useEffect, useMemo, type FormEvent } from "react"
import { useForm, useWatch, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Member } from "@/lib/types"
import { useAddMember, useEditMember } from "@/hooks/members"
import { useActiveMemberTypes } from "@/hooks/memberTypes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
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

const NO_TYPE = "__none__"

const memberFormSchema = (t: TFunction) =>
  z.object({
    ci: requiredString(t),
    first_name: requiredString(t),
    last_name: requiredString(t),
    phone: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^\d{6,13}$/.test(v),
        () => ({ message: t("members.phoneInvalid") }),
      ),
    phoneCountry: z.string().default("BO"),
    address: z.string().optional(),
    memberTypeId: z.string().optional(),
  })

type MemberFormValues = z.infer<ReturnType<typeof memberFormSchema>>

const DEFAULT_FORM: MemberFormValues = {
  ci: "",
  first_name: "",
  last_name: "",
  phone: "",
  phoneCountry: "BO",
  address: "",
  memberTypeId: "",
}

interface MemberFormDialogProps {
  open: boolean
  editing: Member | null
  onOpenChange: (open: boolean) => void
}

export default function MemberFormDialog({
  open,
  editing,
  onOpenChange,
}: MemberFormDialogProps) {
  const { t } = useTranslation()
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const addMember = useAddMember()
  const editMember = useEditMember()
  const { data: activeTypes } = useActiveMemberTypes()

  const typeOptions = useMemo(() => {
    const options = (activeTypes ?? [])
      .map((mt) => ({ label: mt.name, value: mt.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
    const current = editing?.member_type
    if (
      current &&
      !current.is_active &&
      !options.some((o) => o.value === current.id)
    ) {
      options.push({ label: `${current.name}`, value: current.id })
    }
    options.unshift({ label: t("memberTypes.noType"), value: NO_TYPE })
    return options
  }, [activeTypes, editing, t])

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            ci: editing.ci,
            first_name: editing.first_name,
            last_name: editing.last_name,
            phone: editing.phone ?? "",
            phoneCountry: editing.phone_country ?? "BO",
            address: editing.address ?? "",
            memberTypeId: editing.member_type?.id ?? "",
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  const watchMemberTypeId = useWatch({ control: form.control, name: "memberTypeId" })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        ci: values.ci,
        firstName: values.first_name,
        lastName: values.last_name,
        phone: values.phone || undefined,
        phoneCountry: values.phoneCountry,
        address: values.address || undefined,
        memberTypeId:
          values.memberTypeId && values.memberTypeId !== NO_TYPE
            ? values.memberTypeId
            : null,
      }
      if (editing) {
        editMember.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("members.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMember.mutate(payload, {
          onSuccess: () => {
            toast.success(t("members.created"))
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
          <DialogTitle>
            {editing ? t("members.editTitle") : t("members.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {editing ? t("members.editDesc") : t("members.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t("members.firstName")}</Label>
              <Input id="first_name" {...form.register("first_name")} />
              {form.formState.errors.first_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t("members.lastName")}</Label>
              <Input id="last_name" {...form.register("last_name")} />
              {form.formState.errors.last_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.last_name.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci">{t("members.ciLabel")}</Label>
            <Input id="ci" {...form.register("ci")} />
            {form.formState.errors.ci && (
              <p className="text-sm text-destructive">
                {form.formState.errors.ci.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("members.phone")}</Label>
            <Controller
                control={form.control}
                name="phoneCountry"
                render={({ field: countryField }) => (
                    <Controller
                        control={form.control}
                        name="phone"
                        render={({ field: phoneField }) => (
                            <PhoneInput
                                country={countryField.value}
                                onCountryChange={countryField.onChange}
                                value={phoneField.value || ""}
                                onChange={phoneField.onChange}
                                invalid={!!form.formState.errors.phone}
                            />
                        )}
                    />
                )}
            />
            {form.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.phone.message}
                </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t("members.address")}</Label>
            <Input id="address" {...form.register("address")} />
          </div>
          <div className="space-y-2">
            <Label>{t("memberTypes.label")}</Label>
            <ComboboxSelect
              value={watchMemberTypeId}
              onValueChange={(v) => form.setValue("memberTypeId", v)}
              placeholder={t("memberTypes.selectPlaceholder")}
              className="w-full"
              options={typeOptions}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={addMember.isPending || editMember.isPending}>
              {(addMember.isPending || editMember.isPending) ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}