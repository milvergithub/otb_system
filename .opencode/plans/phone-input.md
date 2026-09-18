# Phone input con react-phone-number-input

## Objetivo
Usar `react-phone-number-input` en el campo teléfono del formulario de socio (`MemberFormDialog.tsx`) de registro y edición. Guardar el número en formato E.164.

## Cambios

### 1. Dependencia
`npm i react-phone-number-input -w @otb/client` (incluye tipos TS; trae `libphonenumber-js`).

### 2. Estilos globales
- `packages/client/src/main.tsx`: `import 'react-phone-number-input/style.css'`.
- `packages/client/src/index.css`: overrides para que `<PhoneInput>` calce con el tema shadcn:
  - `.PhoneInputInput`: alto 2.5rem, ancho 100%, borde `hsl(var(--border))` + `var(--radius)`, fondo transparente, focus ring `hsl(var(--ring))`.
  - gap entre selector de país y el input; `border-radius` en `.PhoneInputCountry`.

### 3. `MemberFormDialog.tsx`
- Imports: `PhoneInput` (default) + `isValidPhoneNumber` de `react-phone-number-input`; `Controller` de `react-hook-form`.
- Zod: `phone` opcional; si viene valor, validar `isValidPhoneNumber(v, "BO")`; error `members.phoneInvalid` (nuevo key).
- Reemplazar `<Input id="phone" {...form.register("phone")} />` por:
  ```tsx
  <Controller
    control={form.control}
    name="phone"
    render={({ field }) => (
      <PhoneInput
        value={field.value}
        onChange={(v) => field.onChange(v ?? "")}
        onBlur={field.onBlur}
        defaultCountry="BO"
      />
    )}
  />
  ```
  + mensaje de error condicional (como los demás campos).
- Prefill (edición): convertir valor legacy local (`71234567`) a E.164 (`+59171234567`) con helper `toE164(value)`:
  - si vacío → `""`; si empieza con `+` → tal cual; si no → `parsePhoneNumber(value, 'BO')?.number ?? value` (try/catch).
- Submit: `phone: values.phone || undefined` (ya E.164).

### 4. i18n es/en
- `members.phoneInvalid`: "Número de teléfono inválido" / "Invalid phone number".

### 5. Sin cambios en server
- DTO `phone` sigue siendo `IsString` opcional → acepta `+591...`.
- `WhatsAppService.normalizePhone` y `getWhatsAppUrl` (client) quitan no-dígitos y prefijan `591` → compatibles con E.164 y con los datos legacy existentes.

## Verificación
`npm run build` + `npm run lint`; prueba manual: registrar socio con selector de país BO, verificar WhatsApp (welcome) y `wa.me/591...`.

## Nota
Formatos mixtos en DB (legacy local y nuevos E.164) son compatibles en WhatsApp. Opcional (no incluido): formatear `member.phone` con `formatPhoneNumber` en listas/detalles para mostrar "+591 7..." (avisar si lo quieres).