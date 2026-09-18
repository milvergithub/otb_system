# Phone input con shadcn + país por socio

## Objetivo
Reemplazar `react-phone-number-input` por un componente propio construido con componentes shadcn (`Select`, `Input`). Selector de país limitado a Sudamérica + USA con bandera emoji. Guardar el país por socio (`phone_country`, ISO) y que WhatsApp use el dial code correspondiente en lugar de siempre 591.

## Server

### 1. `packages/server/src/modules/members/entities/member.entity.ts`
Agregar columna:
```ts
@Column({ length: 2, default: 'BO' })
phone_country: string;
```
En dev `synchronize:true` la crea; Postgres rellena `'BO'` en las filas existentes al agregar con default.

### 2. `dto/member.dto.ts`
`CreateMemberDto` += `@IsOptional() @IsString() phoneCountry?: string;` (Update hereda con PartialType).

### 3. `members.service.ts`
- create: `phone_country: dto.phoneCountry ?? 'BO'`.
- update: `phone_country: dto.phoneCountry ?? member.phone_country`.
- emit `member.created` += `phone_country: saved.phone_country`.

### 4. `whatsapp.service.ts`
- Mapa dialectos (SA + USA): `AR 54, BO 591, BR 55, CL 56, CO 57, EC 593, GY 592, PY 595, PE 51, SR 597, UY 598, VE 58, US 1`; fallback 591.
- `normalizePhone(phone, country='BO')`: usa `DIAL_CODES[country] ?? '591'` (no duplica si ya arranca con el dial).
- `sendText` / `sendTemplate` / `sendDocument`: parámetro `country = 'BO'` que pasa a `normalizePhone`.
- Handlers `@OnEvent`: tipos de payload += `phone_country?: string`; pasan `payload.phone_country ?? 'BO'`.

### 5. Emisores (agregar `phone_country` al payload, todos tienen `member` a mano)
- `members.service.ts` (`member.created`): `saved.phone_country`.
- `meters.service.ts` (`meter.created` y `share.payment.created`): `member.phone_country`.
- `share-payments.service.ts` (`share.payment.created`): `member.phone_country`.
- `billing.service.ts` (`bill.generated` y `payment.completed`): `member.phone_country`.

## Client

### 6. Remover react-phone-number-input
- `npm uninstall react-phone-number-input -w @otb/client`.
- Quitar `import "react-phone-number-input/style.css"` de `main.tsx`.
- Quitar overrides `.PhoneInput*` de `index.css`.

### 7. Nuevo `packages/client/src/lib/phone.ts`
- `export const COUNTRIES` (13): `{ code, name, dialCode, flag }` para AR, BO, BR, CL, CO, EC, GY, PY, PE, SR, UY, VE, US (banderas emoji).
- `export const DIAL_CODES: Record<string,string>`.
- `getDialCode(country)` helper.

### 8. Nuevo `packages/client/src/components/ui/phone-input.tsx`
**`PhoneInput`** controlado (sin libs externas):
```tsx
interface PhoneInputProps {
  country: string
  onCountryChange: (code: string) => void
  value: string                       // dígitos locales (sin prefijo)
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
}
```
- Layout: `Select` (flag + `+dial`, `value=country`, `onValueChange=onCountryChange`, items con emoji + nombre) a la izquierda + `Input` (`inputMode="numeric"`) a la derecha, ambos h-8, en contenedor flex gap-2.
- Número: al escribir, quitar no-dígitos; si el resultado empieza con el `dialCode` del país seleccionado y queda ≥7 dígitos, quitar el prefijo (guarda solo número local).

### 9. `MemberFormDialog.tsx`
- Quitar imports/helpers `react-phone-number-input`, `isValidPhoneNumber`, `toE164`, `toLocal`.
- Campos form: `phone: z.string().optional()` (refine `^\d{6,13}$` si hay valor → `members.phoneInvalid`), y nuevo `phoneCountry: z.string().default('BO')`.
- `Controller` de `phone` renderiza `<PhoneInput country={watch('phoneCountry')} onCountryChange={(c)=>setValue('phoneCountry', c)} value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.phone} />`.
- Prefill edit: `phone: editing.phone ?? ""`, `phoneCountry: editing.phone_country ?? "BO"`.
- Submit: `phone: values.phone || undefined`, `phoneCountry: values.phoneCountry`.

### 10. `lib/types.ts` y `hooks/members.ts`
- `Member` += `phone_country?: string | null`.
- `MemberRequest` += `phoneCountry?: string`.

### 11. `lib/utils.ts` + display
- `getWhatsAppUrl(phone, country = "BO")`: usa `DIAL_CODES` en vez de fijar 591 (no duplicar si ya arranca con el dial).
- Callers actualizados pasando `member.phone_country`: `pages/members/index.tsx`, `pages/meters/index.tsx`, `pages/meters/MeterDetailSheet.tsx`.

## Verificación
- `npm run build` (ambos) + `npm run lint`.
- Smoke: registrar socio país BO (welcome a 591...) y país US (welcome a 1...), editar socio con número legacy, validar wa.me con país.

## Notas
- Sin migración espejo (dev usa synchronize; columna con default para datos existentes).
- US dial es `1`, así que al seleccionar US solo se prefija si el número no trae ya el prefijo; números locales US (10 dígitos) no se recortan.
- Se mantiene alta `BODY_LIMIT` (sin cambios).