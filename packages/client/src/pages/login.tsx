import { type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navigate, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { Droplets } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import logo from "@/assets/img.png"

const loginFormSchema = (t: TFunction) =>
  z.object({
    email: requiredString(t),
    password: requiredString(t),
  })

type LoginFormValues = z.infer<ReturnType<typeof loginFormSchema>>

const DEFAULT_LOGIN_FORM: LoginFormValues = {
  email: "",
  password: "",
}

export default function LoginPage() {
  const { user, login } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema(t)),
    defaultValues: DEFAULT_LOGIN_FORM,
  })

  if (user) {
    return <Navigate to="/" replace />
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit(async (values) => {
      try {
        await login(values.email, values.password)
        navigate("/")
      } catch (err) {
        toast.error(getApiErrorMessage(err))
      }
    })()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex w-full items-center justify-center rounded-xl text-primary-foreground">
            <img src={logo} alt="Logo" className="size-24" />
          </div>
          <CardTitle className="text-xl">{t("login.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("login.subtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
