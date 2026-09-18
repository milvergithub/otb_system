import { useEffect, useRef, useState, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Save, Settings as SettingsIcon, Gauge, Map, HandCoins, Percent, TrendingUp, MessageSquare } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useSettings, useUpdateSettings } from "@/hooks/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MeterTypesPanel from "./meters/MeterTypesPanel"
import ZoneTypesPanel from "./zones/ZoneTypesPanel"
import SharesPage from "./shares"
import DiscountsPage from "./discounts"
import TariffsPage from "./tariffs"
import WhatsAppSettingsPanel from "./settings/WhatsAppSettingsPanel"
import Can from "@/components/Can"
import { toast } from "sonner"

const SETTING_LABELS: Record<string, { label: string; description: string }> = {
  payment_due_day: {
    label: "settings.paymentDueDay.label",
    description: "settings.paymentDueDay.description",
  },
  organization_name: {
    label: "settings.organizationName.label",
    description: "settings.organizationName.description",
  },
  currency: {
    label: "settings.currency.label",
    description: "settings.currency.description",
  },
}

const NUMBER_KEYS = ["payment_due_day"]
const OPENWA_KEYS = [
  "openwa_api_key",
  "openwa_consumption_template_id",
  "openwa_welcome_template_id",
  "openwa_meter_registered_template_id",
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission("settings.update")
  const [activeTab, setActiveTab] = useState("general")

  const { data: settings, isLoading } = useSettings()

  const updateMutation = useUpdateSettings()

  const form = useForm<Record<string, string>>({ defaultValues: {} })
  const loadedRef = useRef(false)

  useEffect(() => {
    if (settings && !loadedRef.current) {
      form.reset(settings)
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <Can permission="settings.read">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="size-4" />
              {t("settings.general")}
            </TabsTrigger>
          </Can>
          <Can permission="settings.read">
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="size-4" />
              {t("settings.whatsapp.tab")}
            </TabsTrigger>
          </Can>
          <Can permission="meter_types.read">
            <TabsTrigger value="meterTypes" className="gap-2">
              <Gauge className="size-4" />
              {t("settings.meterTypes")}
            </TabsTrigger>
          </Can>
          <Can permission="zone_types.read">
            <TabsTrigger value="zoneTypes" className="gap-2">
              <Map className="size-4" />
              {t("settings.zoneTypes")}
            </TabsTrigger>
          </Can>
          <Can permission="shares.read">
            <TabsTrigger value="shares" className="gap-2">
              <HandCoins className="size-4" />
              {t("settings.shares")}
            </TabsTrigger>
          </Can>
          <Can permission="discounts.read">
            <TabsTrigger value="discounts" className="gap-2">
              <Percent className="size-4" />
              {t("settings.discounts")}
            </TabsTrigger>
          </Can>
          <Can permission="tariffs.read">
            <TabsTrigger value="tariffs" className="gap-2">
              <TrendingUp className="size-4" />
              {t("settings.tariffs")}
            </TabsTrigger>
          </Can>
        </TabsList>

        <Can permission="settings.read">
          <TabsContent value="general">
            <div className="mt-4 space-y-4">
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {Object.keys(settings ?? {}).filter((key) => !OPENWA_KEYS.includes(key)).map((key) => {
                  const meta = SETTING_LABELS[key]
                  const isNumber = NUMBER_KEYS.includes(key)
                  return (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>
                        {meta ? t(meta.label) : key}
                      </Label>
                      <Input
                        id={key}
                        type={isNumber ? "number" : "text"}
                        step={isNumber ? "0.01" : undefined}
                        min={key === "payment_due_day" ? 1 : undefined}
                        max={key === "payment_due_day" ? 28 : undefined}
                        disabled={!canUpdate}
                        {...form.register(key)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {meta ? t(meta.description) : null}
                      </p>
                    </div>
                  )
                })}
                {canUpdate ? (
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={!form.formState.isDirty || updateMutation.isPending}
                    >
                      <Save className="mr-2 size-4" />
                      {updateMutation.isPending ? t("common.saving") : t("settings.saveSettings")}
                    </Button>
                  </div>
                ) : null}
              </form>
            </div>
          </TabsContent>
        </Can>

        <Can permission="settings.read">
          <TabsContent value="whatsapp">
            <WhatsAppSettingsPanel />
          </TabsContent>
        </Can>

        <Can permission="meter_types.read">
          <TabsContent value="meterTypes">
            <div className="mt-4">
              <MeterTypesPanel />
            </div>
          </TabsContent>
        </Can>

        <Can permission="zone_types.read">
          <TabsContent value="zoneTypes">
            <div className="mt-4">
              <ZoneTypesPanel />
            </div>
          </TabsContent>
        </Can>

        <Can permission="shares.read">
          <TabsContent value="shares">
            <div className="mt-4">
              <SharesPage />
            </div>
          </TabsContent>
        </Can>

        <Can permission="discounts.read">
          <TabsContent value="discounts">
            <div className="mt-4">
              <DiscountsPage />
            </div>
          </TabsContent>
        </Can>

        <Can permission="tariffs.read">
          <TabsContent value="tariffs">
            <div className="mt-4">
              <TariffsPage />
            </div>
          </TabsContent>
        </Can>
      </Tabs>
    </div>
  )
}
