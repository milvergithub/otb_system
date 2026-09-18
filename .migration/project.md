# Base UI migration (whole project)

2026-08-16, strategy: golden pair via CLI (base-nova), whole-project mode. Verdict: clean — all 16 Radix wrappers were pristine (registry artifacts only), no customizations lost.

## Changed

### components.json
- `"style": "radix-nova"` -> `"base-nova"` (one-line flip; `base` field now `base`).

### Wrappers (16), regenerated one-by-one with `npx shadcn@latest add -o <component>`
button, label, alert-dialog, avatar, badge, checkbox, dialog, dropdown-menu, popover, scroll-area, select, separator, sheet, switch, tabs, tooltip.
- Import source: `radix-ui` -> `@base-ui/react/<kebab-name>`.
- Part renames handled by the registry pair (Overlay->Backdrop, Content->Popup, tabs Trigger->Tab, menu Label->GroupLabel, Select Viewport->List, etc.).
- `asChild` -> `render` inside wrappers; `button.tsx` now uses the real `@base-ui/react/button` primitive.
- The only prior customization, `variant="destructive"` on `DropdownMenuItem`, is stock in base-nova and survived regeneration unchanged.
- Leftover sweep per file clean: `grep "radix-ui|@radix-ui|IconPlaceholder"` -> no matches.

### App code (consumer sweep)
- `asChild` -> `render`: `src/components/layout.tsx` (NotificationBell Button, LanguageSwitcher trigger, UserMenu trigger, Sheet trigger), `src/components/ui/row-actions.tsx` (trigger), `src/components/ui/date-picker.tsx` (PopoverTrigger; the DayPicker `onSelect` is react-day-picker and untouched).
- `onSelect` -> `onClick` on dropdown items: `row-actions.tsx` (`RowActionItem.onClick`), `layout.tsx` (language switch, logout), and 10 pages: members, meters, users, shares, tariffs, roles, discounts, billing, consumption, notifications.
- `Select.onValueChange` value widened to `string | null` (Base UI): coerced with `v ?? ""` at 17 call sites across billing/index, PayBillDialog, consumption/index, RecordConsumptionDialog, DiscountFormDialog, meters/index, MeterFormDialog, SharePaymentsDialog, reports.
- `TooltipProvider delayDuration` -> `delay`: `src/main.tsx`.

### Dependencies
- Removed: `radix-ui` and 15 `@radix-ui/react-*` packages (incl. unused `@radix-ui/react-toast`).
- Added: `@base-ui/react` (1.7.0).

## Left alone
- Non-radix libraries/wrappers untouched: `sonner` (toast), `react-day-picker` (calendar), `recharts` (chart), `cmdk`, `leaflet`/`react-leaflet`. `src/components/ui/{card,input,textarea,table,skeleton,input-group,page-loader,sortable-header,calendar,sonner}.tsx` are data/third-party wrappers, not Radix.

## Behavior changes
- Base UI Select emits `null` in `onValueChange` when a selection is cleared; guarded with `?? ""` (no clear UI exists, so no behavior change).
- Dropdown items now fire `onClick`; `closeOnClick` defaults to true for plain `Menu.Item` (same close-on-select behavior as Radix).
- Tabs default to manual activation in Base UI (no `activationMode` used in this app).

## Verify by hand
- Open a member -> actions dropdown (RowActions) on desktop and mobile sheet.
- Filters on Billing / Consumption / Meters pages (Select), reports year Select.
- Modals: create/edit dialogs (dialog/sheet), delete confirmations (alert-dialog), date-picker popover in meter form, language switcher + logout menu.
- Rows: activate/deactivate, generate bill, mark notification read, download receipt.

## Final state
- `npx tsc -b --noEmit`: pass.
- `npx eslint src`: 0 errors, 4 pre-existing fast-refresh warnings (badge, button, tabs, auth).
- `npm run build`: pass (pre-existing chunk-size warning only).
- Runtime smoke: login page renders without errors on Vite dev.
- Wrappers remaining on Radix: 0.
