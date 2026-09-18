import { useEffect, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { UserWithRoles } from "@/lib/types"
import { useRoles, useAssignUserRoles } from "@/hooks/roles"
import { useAddUser, useEditUser } from "@/hooks/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

export type UserDialogMode = "create" | "edit" | "roles"

const userFormSchema = (t: TFunction) =>
  z.object({
    email: requiredString(t),
    password: z.string().optional(),
    full_name: requiredString(t),
    role_ids: z.array(z.string()).optional(),
  })

type UserFormValues = z.infer<ReturnType<typeof userFormSchema>>

const DEFAULT_FORM: UserFormValues = {
  email: "",
  password: "",
  full_name: "",
  role_ids: [],
}

interface UserDialogProps {
  mode: UserDialogMode | null
  editing: UserWithRoles | null
  onOpenChange: (open: boolean) => void
}

export default function UserDialog({
  mode,
  editing,
  onOpenChange,
}: UserDialogProps) {
  const { t } = useTranslation()
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const watchRoleIds = useWatch({ control: form.control, name: "role_ids" })

  const { data: roles } = useRoles()

  const addMutation = useAddUser()
  const editMutation = useEditUser()
  const assignRolesMutation = useAssignUserRoles()

  useEffect(() => {
    if (!mode) return
    if (mode === "create") {
      form.reset(DEFAULT_FORM)
    } else if (editing) {
      form.reset({
        email: editing.email,
        password: "",
        full_name: editing.full_name,
        role_ids: editing.roles?.map((r) => r.id) ?? [],
      })
    }
  }, [mode, editing, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      if (mode === "roles") {
        if (editing) {
          assignRolesMutation.mutate(
            { userId: editing.id, roleIds: values.role_ids ?? [] },
            {
              onSuccess: () => {
                toast.success(t("users.rolesUpdated"))
                onOpenChange(false)
              },
              onError: (err) => toast.error(getApiErrorMessage(err)),
            },
          )
        }
        return
      }
      if (mode === "create") {
        addMutation.mutate(
          {
            email: values.email,
            password: values.password,
            fullName: values.full_name,
            roleIds: values.role_ids ?? [],
          },
          {
            onSuccess: () => {
              toast.success(t("users.created"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else if (mode === "edit" && editing) {
        editMutation.mutate(
          {
            id: editing.id,
            email: values.email,
            fullName: values.full_name,
            password: values.password || undefined,
            roleIds: values.role_ids ?? [],
          },
          {
            onSuccess: () => {
              toast.success(t("users.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      }
    })()
  }

  function toggleRole(roleId: string) {
    const current = watchRoleIds ?? []
    form.setValue(
      "role_ids",
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    )
  }

  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t("users.createTitle")
              : mode === "roles"
                ? t("users.rolesTitle")
                : t("users.editTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? t("users.createDescription")
              : mode === "roles"
                ? t("users.rolesDescription", { name: editing?.full_name })
                : t("users.editDescription", { name: editing?.full_name })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {(mode === "create" || mode === "edit") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("users.fullName")}</Label>
                <Input id="fullName" required {...form.register("full_name")} />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("users.email")}</Label>
                <Input id="email" type="email" required {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {mode === "edit" ? t("users.newPassword") : t("users.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                  required={mode === "create"}
                  minLength={mode === "create" ? 6 : undefined}
                />
              </div>
            </>
          )}
          <div className="space-y-3">
            <Label>{t("users.roles")}</Label>
            <div className="space-y-2">
              {roles?.map((role) => (
                <div key={role.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={(watchRoleIds ?? []).includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <div>
                    <p className="text-sm font-medium">{role.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {role.description ||
                        t("users.rolePermissions", {
                          count: role.permissions?.length ?? 0,
                        })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                addMutation.isPending ||
                editMutation.isPending ||
                assignRolesMutation.isPending
              }
            >
              {addMutation.isPending ||
              editMutation.isPending ||
              assignRolesMutation.isPending
                ? t("common.saving")
                : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
