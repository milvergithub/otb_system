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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { RESOURCES } from "./constants"

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

  function togglePermission(permissionId: string) {
    const next = permissionIds.includes(permissionId)
      ? permissionIds.filter((id) => id !== permissionId)
      : [...permissionIds, permissionId]
    form.setValue("permission_ids", next)
  }

  function toggleResourcePermissions(resource: string) {
    const resourcePerms =
      permissions?.filter((p) => p.resource === resource) ?? []
    const allSelected = resourcePerms.every((p) =>
      permissionIds.includes(p.id),
    )
    const next = allSelected
      ? permissionIds.filter((id) => !resourcePerms.some((p) => p.id === id))
      : [...new Set([...permissionIds, ...resourcePerms.map((p) => p.id)])]
    form.setValue("permission_ids", next)
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
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {RESOURCES.map((resource) => {
                  const resourcePerms =
                    permissions?.filter((p) => p.resource === resource) ?? []
                  const allSelected = resourcePerms.every((p) =>
                    permissionIds.includes(p.id),
                  )
                  return (
                    <div key={resource} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() =>
                            toggleResourcePermissions(resource)
                          }
                        />
                        <span className="text-sm font-semibold capitalize">
                          {t(`roles.resource.${resource}`)}
                        </span>
                      </div>
                      <div className="ml-6 flex flex-wrap gap-2">
                        {resourcePerms.map((perm) => (
                          <Badge
                            key={perm.id}
                            variant={
                              permissionIds.includes(perm.id)
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer"
                            onClick={() => togglePermission(perm.id)}
                          >
                            {t(`roles.action.${perm.action}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
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
