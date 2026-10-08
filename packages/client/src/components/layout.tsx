import { cn } from '@/lib/utils.ts';
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import logo from "@/assets/img.png";
import {
  BarChart3,
  Package,
  Bell,
  Check,
  FileText,
  Gauge,
  History,
  Languages,
  Landmark,
  LayoutDashboard,
  Map,
  Receipt,
  Settings,
  Shield,
  Users,
  UserCog,
  Wallet,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useUnreadCount } from "@/hooks/notifications"
import Can from "@/components/Can"
import { SUPPORTED_LANGUAGES } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "nav.dashboard", icon: LayoutDashboard, permission: "reports.dashboard" },
  { to: "/members", label: "nav.members", icon: Users, permission: "members.read" },
  { to: "/meters", label: "nav.meters", icon: Gauge, permission: "meters.read" },
  { to: "/zones", label: "nav.zones", icon: Map, permission: "zones.read" },
  { to: "/consumption", label: "nav.consumption", icon: BarChart3, permission: "consumption.read" },
  { to: "/billing", label: "nav.billing", icon: Receipt, permission: "billing.read" },
  { to: "/actividades", label: "nav.activities", icon: Landmark, permission: "activities.read" },
  { to: "/bienes", label: "nav.assets", icon: Package, permission: "assets.read" },
  { to: "/finanzas", label: "nav.finances", icon: Wallet, permission: "finances.read" },
  { to: "/reports", label: "nav.reports", icon: FileText, permission: "reports.read" },
  { to: "/notifications", label: "nav.notifications", icon: Bell, permission: "notifications.read" },
  { to: "/settings", label: "nav.settings", icon: Settings, permission: "settings.read" },
]

interface NavItem {
  to: string
  label: string
  icon: typeof Users
  permission?: string
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/roles", label: "nav.roles", icon: Shield, permission: "roles.read" },
  { to: "/users", label: "nav.users", icon: UserCog, permission: "users.read" },
  { to: "/audit", label: "nav.auditLogs", icon: History, permission: "audit.read" },
]

function SidebarNavItem({ item }: { item: NavItem }) {
  const location = useLocation()
  const { t } = useTranslation()
  const isActive =
    item.to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.to)
  return (
    <SidebarMenuItem className="relative">
      {isActive && (<span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 bg-accent rounded-full"></span>)}
      <SidebarMenuButton
        isActive={isActive}
        tooltip={t(item.label)}
        className="h-12 rounded-xl"
        render={<NavLink to={item.to} />}
      >
        <div className={cn("p-2 rounded-full flex items-center justify-center", isActive ? "bg-accent" : "bg-sidebar")}>
          <item.icon className="size-5!" />
        </div>
        <span>{t(item.label)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarNav() {
  const { hasPermission } = useAuth()
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    !item.permission || hasPermission(item.permission),
  )
  const visibleAdminItems = ADMIN_NAV_ITEMS.filter((item) =>
    hasPermission(item.permission ?? ""),
  )
  return (
    <>
      <SidebarMenu>
        {visibleNavItems.map((item) => (
          <SidebarNavItem key={item.to} item={item} />
        ))}
      </SidebarMenu>
      {visibleAdminItems.length > 0 && (
        <>
          <SidebarSeparator />
          <SidebarMenu>
            {visibleAdminItems.map((item) => (
              <SidebarNavItem key={item.to} item={item} />
            ))}
          </SidebarMenu>
        </>
      )}
    </>
  )
}

function NotificationBell() {
  const { t } = useTranslation()
  const { data: count } = useUnreadCount(60_000)
  const navigate = useLocation()
  void navigate
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      nativeButton={false}
      render={
        <NavLink to="/notifications" aria-label={t("nav.notificationsLabel")} />
      }
    >
      <Bell className="size-5" />
      {count ? (
        <Badge className="absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 text-xs">
          {count}
        </Badge>
      ) : null}
    </Button>
  )
}

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith("es") ? "es" : "en"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
      >
        <Languages className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
          >
            <div className="flex w-full items-center gap-2">
              <span className="flex-1">{lang.label}</span>
              {current === lang.code ? (
                <Check className="size-4" />
              ) : null}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const initials = user?.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:block">
              {user?.full_name}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col">
          <span>{user?.full_name}</span>
          <span className="text-xs font-normal text-muted-foreground">
              {user?.email}
            </span>
          <span className="mt-1 text-xs font-normal capitalize text-muted-foreground">
              {user?.role}
            </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>{t("nav.logOut")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Layout() {
  const { t } = useTranslation()
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Avatar size="lg">
                <AvatarImage
                    src={logo}
                    alt="@shadcn"
                    className="bg-background p-1 size-10"
                />
              </Avatar>
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold leading-tight text-sidebar-foreground">{t("nav.appName")}</p>
              <p className="text-xs text-sidebar-foreground/70">{t("nav.appTagline")}</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-4">
          <SidebarNav />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-muted/40">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-2">
            <Can permission="notifications.read">
              <NotificationBell />
            </Can>
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col p-4 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
