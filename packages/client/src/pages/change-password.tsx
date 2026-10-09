import { type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Check, X, KeyRound } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api"
import {
  checkPasswordStrength,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
} from "@/lib/password"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const changePasswordSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1, { message: t("validation.required") }),
      newPassword: z
        .string()
        .min(PASSWORD_MIN_LENGTH, {
          message: t("validation.minLength", { count: PASSWORD_MIN_LENGTH }),
        })
        .max(PASSWORD_MAX_LENGTH, {
          message: t("validation.maxLength", { count: PASSWORD_MAX_LENGTH }),
        }),
      newPasswordConfirmation: z
        .string()
        .min(1, { message: t("validation.required") }),
    })
    .refine((v) => checkPasswordStrength(v.newPassword).valid, {
      path: ["newPassword"],
      message: t("validation.weakPassword"),
    })
    .refine((v) => v.newPassword === v.newPasswordConfirmation, {
      path: ["newPasswordConfirmation"],
      message: t("validation.passwordsDoNotMatch"),
    })

type ChangePasswordFormValues = z.infer<ReturnType<typeof changePasswordSchema>>

const DEFAULT_FORM: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  newPasswordConfirmation: "",
}

function Rule({ rule, met }: { rule: string; met: boolean }) {
  const { t } = useTranslation()
  return (
    <li
      className={cn(
        "flex items-center gap-2 text-xs",
        met ? "text-emerald-600" : "text-muted-foreground",
      )}
    >
      {met ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <X className="size-3.5" aria-hidden />
      )}
      <span>{t(`changePassword.rules.${rule}`)}</span>
    </li>
  )
}

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const newPassword = useWatch({
    control: form.control,
    name: "newPassword",
  })
  const failures = checkPasswordStrength(newPassword).failures

  const forced = user?.must_change_password === true

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit(async (values) => {
      try {
        await changePassword(
          values.currentPassword,
          values.newPassword,
          values.newPasswordConfirmation,
        )
        toast.success(t("changePassword.success"))
        navigate("/", { replace: true })
      } catch (err) {
        toast.error(getApiErrorMessage(err))
      }
    })()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t("changePassword.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {forced
              ? t("changePassword.subtitleForced")
              : t("changePassword.subtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                {t("changePassword.currentPassword")}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...form.register("currentPassword")}
              />
              {form.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {t("changePassword.newPassword")}
              </Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <ul className="grid gap-1.5">
              {PASSWORD_RULES.map((rule) => (
                <Rule key={rule} rule={rule} met={!failures.includes(rule)} />
              ))}
            </ul>

            <div className="space-y-2">
              <Label htmlFor="newPasswordConfirmation">
                {t("changePassword.confirmPassword")}
              </Label>
              <Input
                id="newPasswordConfirmation"
                type="password"
                autoComplete="new-password"
                {...form.register("newPasswordConfirmation")}
              />
              {form.formState.errors.newPasswordConfirmation && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.newPasswordConfirmation.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? t("changePassword.submitting")
                : t("changePassword.submit")}
            </Button>

            {!forced && (
              <p className="text-center text-sm">
                <Link to="/" className="text-primary hover:underline">
                  {t("changePassword.back")}
                </Link>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
