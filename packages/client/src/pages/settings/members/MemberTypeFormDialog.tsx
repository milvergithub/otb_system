import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { MemberType } from "@/lib/types"
import { useCreateMemberType, useEditMemberType } from "@/hooks/memberTypes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const memberTypeFormSchema = (t: TFunction) =>
  z.object({
    code: requiredString(t).max(30),
    name: requiredString(t).max(50),
    description: z.string().optional(),
    sortOrder: z.coerce
      .number()
      .int()
      .min(0, { message: t("memberTypes.sortOrderInvalid") }),
    isActive: z.boolean(),
  })

type MemberTypeFormValues = z.infer<ReturnType<typeof memberTypeFormSchema>>

const DEFAULT_FORM: MemberTypeFormValues = {
  code: "",
  name: "",
  description: "",
  sortOrder: 0,
  isActive: true,
}

interface MemberTypeFormDialogProps {
  open: boolean
  editing: MemberType | null
  onOpenChange: (open: boolean) => void
}

export default function MemberTypeFormDialog({
  open,
  editing,
  onOpenChange,
}: MemberTypeFormDialogProps) {
  const { t } = useTranslation()
  const form = useForm<MemberTypeFormValues>({
    resolver: zodResolver(memberTypeFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const createType = useCreateMemberType()
  const editType = useEditMemberType()

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            description: editing.description ?? "",
            sortOrder: editing.sort_order,
            isActive: editing.is_active,
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        code: values.code,
        name: values.name,
        description: values.description?.trim() || undefined,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
      }
      if (editing) {
        editType.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("memberTypes.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        createType.mutate(payload, {
          onSuccess: () => {
            toast.success(t("memberTypes.created"))
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
            {editing ? t("memberTypes.editTitle") : t("memberTypes.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {editing ? t("memberTypes.editDesc") : t("memberTypes.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mt-name">{t("memberTypes.name")}</Label>
            <Input id="mt-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mt-code">{t("memberTypes.code")}</Label>
            <Input
              id="mt-code"
              {...form.register("code")}
              className="font-mono uppercase"
              maxLength={30}
              disabled={!!editing}
            />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mt-description">{t("memberTypes.description")}</Label>
            <Textarea id="mt-description" {...form.register("description")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mt-sort">{t("memberTypes.sortOrder")}</Label>
              <Input
                id="mt-sort"
                type="number"
                min={0}
                {...form.register("sortOrder")}
              />
              {form.formState.errors.sortOrder && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.sortOrder.message}
                </p>
              )}
            </div>
            <div className="flex items-end pb-1">
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    {t("memberTypes.isActive")}
                  </label>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createType.isPending || editType.isPending}
            >
              {(createType.isPending || editType.isPending)
                ? t("common.saving")
                : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}