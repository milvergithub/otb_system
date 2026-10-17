import { useEffect, useRef, useState, type FormEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
    Save,
    Settings as SettingsIcon,
    Gauge,
    Map,
    HandCoins,
    Percent,
    TrendingUp,
    MessageSquare,
    Boxes,
    Wallet,
    Tags,
    CreditCard
} from "lucide-react"
import { getApiErrorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useSettings, useUpdateSettings } from "@/hooks/settings"
import { useSearchUsers } from "@/hooks/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ComboboxSelect } from "@/components/ui/combobox"
import { Switch } from "@/components/ui/switch"
import { ResponsiveTabs } from "@/components/ui/responsive-tabs"
import MeterTypesPanel from "./meters/MeterTypesPanel"
import ZoneTypesPanel from "./zones/ZoneTypesPanel"
import AssetCategoriesPanel from "./assets/AssetCategoriesPanel"
import AssetLocationsPanel from "./assets/AssetLocationsPanel"
import FinanceCategoriesPanel from "./finances/FinanceCategoriesPanel"
import SharesPage from "./shares"
import DiscountsPage from "./discounts"
import SurchargesPage from "./surcharges"
import TariffsPage from "./tariffs"
import WhatsAppSettingsPanel from "./settings/WhatsAppSettingsPanel"
import MemberTypesPanel from "./settings/members/MemberTypesPanel"
import PaymentMethodsPanel from "./settings/paymentMethods/PaymentMethodsPanel"
import Can from "@/components/Can"
import { toast } from "sonner"

const SETTING_LABELS: Record<string, { label: string; description: string }> = {
    payment_due_day: {
        label: "settings.payment_due_day.label",
        description: "settings.payment_due_day.description",
    },
    late_fee_enabled: {
        label: "settings.lateFee.enabled.label",
        description: "settings.lateFee.enabled.description",
    },
    late_fee_min_months: {
        label: "settings.lateFee.minMonths.label",
        description: "settings.lateFee.minMonths.description",
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

const NUMBER_KEYS = ["payment_due_day", "late_fee_min_months"]
const USER_SETTING_KEYS = [
    "water_bill_responsible_user_id",
    "water_share_responsible_user_id",
]
const OPENWA_KEYS = [
    "openwa_api_key",
    "openwa_consumption_template_id",
    "openwa_welcome_template_id",
    "openwa_meter_registered_template_id",
]

export default function SettingsPage() {
    const {t} = useTranslation()
    const {hasPermission} = useAuth()
    const canUpdate = hasPermission("settings.update")

    const {data: settings, isLoading} = useSettings()
    const canPickUsers = hasPermission("users.read")
    const {data: users} = useSearchUsers(undefined, canPickUsers)

    const updateMutation = useUpdateSettings()

    const form = useForm<Record<string, string>>({defaultValues: {}})
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
                <Skeleton className="h-8 w-40"/>
                <Skeleton className="h-40"/>
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

            <ResponsiveTabs
                tabs={[
  ...(hasPermission("settings.read") ? [{
    value: "general",
    label: t("settings.general"),
    icon: <SettingsIcon className="size-4" />,
    content: (
      <>
<div className="mt-4 space-y-4">
                            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                                {Object.keys(settings ?? {}).filter((key) => !OPENWA_KEYS.includes(key) && !(canPickUsers && USER_SETTING_KEYS.includes(key))).map((key) => {
                                    const meta = SETTING_LABELS[key]
                                    const isNumber = NUMBER_KEYS.includes(key)
                                    return (
                                        <div key={key} className="space-y-2">
                                            <Label htmlFor={key}>
                                                {meta ? t(meta.label) : key}
                                            </Label>
                                            {key === "late_fee_enabled" ? (
                                                <Controller
                                                    control={form.control}
                                                    name={key}
                                                    render={({field}) => (
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                id={key}
                                                                checked={field.value === "true"}
                                                                onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                                                                disabled={!canUpdate}
                                                            />
                                                        </div>
                                                    )}
                                                />
                                            ) : (
                                                <Input
                                                    id={key}
                                                    type={isNumber ? "number" : "text"}
                                                    step={isNumber ? "0.01" : undefined}
                                                    min={key === "payment_due_day" ? 1 : undefined}
                                                    max={key === "payment_due_day" ? 28 : undefined}
                                                    disabled={!canUpdate}
                                                    {...form.register(key)}
                                                />
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {meta ? t(meta.description) : null}
                                            </p>
                                        </div>
                                    )
                                })}
                                {canPickUsers ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>{t("settings.waterBillResponsible.label")}</Label>
                                            <Controller
                                                control={form.control}
                                                name="water_bill_responsible_user_id"
                                                render={({field}) => (
                                                    <ComboboxSelect
                                                        value={field.value ?? ""}
                                                        onValueChange={(v) => field.onChange(v)}
                                                        options={[
                                                            {label: t("finances.noResponsible"), value: ""},
                                                            ...(users ?? []).map((u) => ({
                                                                label: u.full_name,
                                                                value: u.id,
                                                            })),
                                                        ]}
                                                        placeholder={t("common.select")}
                                                        searchPlaceholder={t("common.search")}
                                                        disabled={!canUpdate}
                                                    />
                                                )}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t("settings.waterBillResponsible.description")}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("settings.waterShareResponsible.label")}</Label>
                                            <Controller
                                                control={form.control}
                                                name="water_share_responsible_user_id"
                                                render={({field}) => (
                                                    <ComboboxSelect
                                                        value={field.value ?? ""}
                                                        onValueChange={(v) => field.onChange(v)}
                                                        options={[
                                                            {label: t("finances.noResponsible"), value: ""},
                                                            ...(users ?? []).map((u) => ({
                                                                label: u.full_name,
                                                                value: u.id,
                                                            })),
                                                        ]}
                                                        placeholder={t("common.select")}
                                                        searchPlaceholder={t("common.search")}
                                                        disabled={!canUpdate}
                                                    />
                                                )}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t("settings.waterShareResponsible.description")}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}
                                {canUpdate ? (
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={!form.formState.isDirty || updateMutation.isPending}
                                        >
                                            <Save className="mr-2 size-4"/>
                                            {updateMutation.isPending ? t("common.saving") : t("settings.saveSettings")}
                                        </Button>
                                    </div>
                                ) : null}
                            </form>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("settings.read") ? [{
    value: "whatsapp",
    label: t("settings.whatsapp.tab"),
    icon: <MessageSquare className="size-4" />,
    content: (
      <>
<WhatsAppSettingsPanel/>
      </>
    ),
  }] : []),
  ...(hasPermission("meter_types.read") ? [{
    value: "meterTypes",
    label: t("settings.meterTypes"),
    icon: <Gauge className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <MeterTypesPanel/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("zone_types.read") ? [{
    value: "zoneTypes",
    label: t("settings.zoneTypes"),
    icon: <Map className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <ZoneTypesPanel/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("member_types.read") ? [{
    value: "memberTypes",
    label: t("settings.memberTypes"),
    icon: <Tags className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <MemberTypesPanel/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("payment_methods.read") ? [{
    value: "paymentMethods",
    label: t("settings.paymentMethods.tab"),
    icon: <CreditCard className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <PaymentMethodsPanel/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("shares.read") ? [{
    value: "shares",
    label: t("settings.shares"),
    icon: <HandCoins className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <SharesPage/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("discounts.read") ? [{
    value: "discounts",
    label: t("settings.discounts"),
    icon: <Percent className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <DiscountsPage/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("surcharges.read") ? [{
    value: "surcharges",
    label: t("settings.surcharges"),
    icon: <Percent className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <SurchargesPage/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("tariffs.read") ? [{
    value: "tariffs",
    label: t("settings.tariffs"),
    icon: <TrendingUp className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <TariffsPage/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("assets.read") ? [{
    value: "assetCategories",
    label: t("settings.assetCategories"),
    icon: <Boxes className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <AssetCategoriesPanel/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("assets.read") ? [{
    value: "assetLocations",
    label: t("settings.assetLocations"),
    icon: <Boxes className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <AssetLocationsPanel/>
                        </div>
      </>
    ),
  }] : []),
  ...(hasPermission("finances.read") ? [{
    value: "financeCategories",
    label: t("settings.financeCategories"),
    icon: <Wallet className="size-4" />,
    content: (
      <>
<div className="mt-4">
                            <FinanceCategoriesPanel/>
                        </div>
      </>
    ),
  }] : []),
                ]}
                defaultValue="general"
                className="w-full"
                listClassName="w-full"
                contentClassName="mt-4"
                aria-label={t("settings.title")}
            />
        </div>
    )
}
