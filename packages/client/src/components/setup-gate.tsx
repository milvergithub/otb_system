import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useSetupStatus } from "@/hooks/setup"
import { PageLoader } from "@/components/ui/page-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const SETUP_PATH = "/setup"

export function SetupGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { data, isPending, isError, isFetching, refetch } = useSetupStatus()

  if (isPending) {
    return <PageLoader />
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-lg">{t("setup.statusErrorTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("errors.setupStatusFailed")}
            </p>
            <Button
              className="w-full"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? t("common.loading") : t("setup.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onSetupPage = location.pathname === SETUP_PATH

  if (!data.setupCompleted && !onSetupPage) {
    return <Navigate to={SETUP_PATH} replace />
  }

  if (data.setupCompleted && onSetupPage) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
