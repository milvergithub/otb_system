import { useEffect, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Role } from "@/lib/types"
import { usePermissions, useAddRole, useEditRole } from "@/hooks/roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import PermissionPicker from "./PermissionPicker"

const roleFormSchema = (t: TFunction) =>
  z.object({
    name: requiredString(t),
    description: z.string().optional(),
    permission_ids: z.array(z.string()),
  })

type RoleFormValues = z.infer<ReturnType<typeof roleFormSchema>>

const DEFAULT_FORM: RoleFormValues = {
  name: "",
  description: "",
  permission_ids: [],
}

interface RoleFormDialogProps {
  open: boolean
  editing: Role | null
  onOpenChange: (open: boolean) => void
}

export default function RoleFormDialog({
  open,
  editing,
  onOpenChange,
}: RoleFormDialogProps) {
  const { t } = useTranslation()
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const permissionIds =
    useWatch({ control: form.control, name: "permission_ids" }) ?? []

  const { data: permissions } = usePermissions()

  const addMutation = useAddRole()
  const editMutation = useEditRole()

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            name: editing.name,
            description: editing.description ?? "",
            permission_ids: editing.permissions?.map((p) => p.id) ?? [],
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        permissionIds: values.permission_ids,
      }
      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("roles.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("roles.createdToast"))
            onOpenChange(false)
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        })
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("roles.editTitle") : t("roles.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {editing ? t("roles.editDescription") : t("roles.newDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t("roles.name")}</Label>
              <Input id="name" required {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("roles.description")}</Label>
              <Input id="description" {...form.register("description")} />
            </div>
          </div>
          <div className="space-y-3">
            <Label>{t("roles.permissions")}</Label>
            <PermissionPicker
              permissions={permissions ?? []}
              value={permissionIds}
              onChange={(ids) => form.setValue("permission_ids", ids)}
            />
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
