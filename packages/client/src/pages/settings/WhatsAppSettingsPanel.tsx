import { useEffect, useRef, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Save } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useSettings, useUpdateSettings } from "@/hooks/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const OPENWA_KEYS = [
  "openwa_api_key",
  "openwa_consumption_template_id",
  "openwa_welcome_template_id",
  "openwa_meter_registered_template_id",
] as const

export default function WhatsAppSettingsPanel() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission("settings.update")

  const { data: settings } = useSettings()
  const updateMutation = useUpdateSettings()

  const form = useForm<Record<string, string>>({ defaultValues: {} })
  const loadedRef = useRef(false)

  useEffect(() => {
    if (settings && !loadedRef.current) {
      const openwaValues: Record<string, string> = {}
      for (const key of OPENWA_KEYS) {
        openwaValues[key] = settings[key] ?? ""
      }
      form.reset(openwaValues)
      loadedRef.current = true
    }
  }, [settings, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      updateMutation.mutate(values, {
        onSuccess: () => toast.success(t("settings.saved")),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      })
    })()
  }

  return (
    <div className="mt-4">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {OPENWA_KEYS.map((key) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {t(`settings.whatsapp.${key}.label`)}
            </Label>
            <Input
              id={key}
              type="text"
              disabled={!canUpdate}
              {...form.register(key)}
            />
            <p className="text-xs text-muted-foreground">
              {t(`settings.whatsapp.${key}.description`)}
            </p>
          </div>
        ))}
        {canUpdate ? (
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!form.formState.isDirty || updateMutation.isPending}
            >
              <Save className="mr-2 size-4" />
              {updateMutation.isPending
                ? t("common.saving")
                : t("settings.saveSettings")}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  )
}
