import { type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { toast } from "sonner"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import { useCreateInitialAdmin, markSetupCompleted } from "@/hooks/setup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import logo from "@/assets/img.png"

const MIN_PASSWORD_LENGTH = 6

const setupFormSchema = (t: TFunction) =>
  z
    .object({
      fullName: requiredString(t),
      email: requiredString(t).pipe(
        z.string().email({ message: t("validation.invalidEmail") }),
      ),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, {
          message: t("validation.minLength", { count: MIN_PASSWORD_LENGTH }),
        }),
      passwordConfirmation: requiredString(t),
    })
    .refine((v) => v.password === v.passwordConfirmation, {
      path: ["passwordConfirmation"],
      message: t("validation.passwordsDoNotMatch"),
    })

type SetupFormValues = z.infer<ReturnType<typeof setupFormSchema>>

const DEFAULT_SETUP_FORM: SetupFormValues = {
  fullName: "",
  email: "",
  password: "",
  passwordConfirmation: "",
}

type FieldName = keyof SetupFormValues

const FIELDS: {
  name: FieldName
  type: string
  autoComplete: string
}[] = [
  { name: "fullName", type: "text", autoComplete: "name" },
  { name: "email", type: "email", autoComplete: "email" },
  { name: "password", type: "password", autoComplete: "new-password" },
  {
    name: "passwordConfirmation",
    type: "password",
    autoComplete: "new-password",
  },
]

export default function SetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createAdmin = useCreateInitialAdmin()

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema(t)),
    defaultValues: DEFAULT_SETUP_FORM,
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit(async (values) => {
      try {
        await createAdmin.mutateAsync({
          ...values,
          email: values.email.trim().toLowerCase(),
        })
        toast.success(t("setup.success"))
        navigate("/", { replace: true })
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409 &&
          err.response.data?.message === "Initial setup has already been completed") {
          toast.error(t("errors.setupAlreadyCompleted"))
          markSetupCompleted(queryClient)
          navigate("/login", { replace: true })
          return
        }
        toast.error(getApiErrorMessage(err))
      }
    })()
  }

  const submitting = form.formState.isSubmitting

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex w-full items-center justify-center rounded-xl text-primary-foreground">
            <img src={logo} alt="Logo" className="size-24" />
          </div>
          <CardTitle className="text-xl">{t("setup.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("setup.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {FIELDS.map((field) => {
              const error = form.formState.errors[field.name]
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{t(`setup.${field.name}`)}</Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    required
                    aria-invalid={!!error}
                    disabled={submitting}
                    {...form.register(field.name)}
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error.message}</p>
                  )}
                </div>
              )
            })}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={submitting}
            >
              {submitting ? t("setup.submitting") : t("setup.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
