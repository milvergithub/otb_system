# Agregar labels a campos en generateInvoicePdf

## Objetivo
En `packages/server/src/modules/billing/receipt.service.ts` → `generateInvoicePdf`, dibujar el label de cada campo justo a la izquierda de su valor usando el ancho real del texto (pdf-lib `font.widthOfTextAtSize`), sin mover los valores de sus coordenadas actuales.

## Labels (aprobados por el usuario, textos sugeridos)
| Campo | Label | Valor (x, y, tamaño) |
|---|---|---|
| data.meterCode | `Medidor:` | (175, 561, 10) |
| data.meterType | `Tipo:` | (155, 545, 10) |
| data.cubicMeters | `m³:` | (150, 528, 10) |
| data.expirationDate | `Vence:` | (190, 512, 10) |
| data.period | `Período:` | (405, 545, 10) |
| data.totalPaid | `Pagado:` | (400, 528, 10) |
| data.totalAmount | `Total:` | (395, 510, 12) |

## Implementación
- Agregar helper privado `drawLabeledValue(page, font, label, value, x, y, size)`:
  ```ts
  const labelWidth = font.widthOfTextAtSize(label, size);
  page.drawText(label, {
    x: x - labelWidth - 4,
    y,
    size,
    font,
    color: textColor,
  });
  page.drawText(value, { x, y, size, font, color: textColor });
  ```
- Reemplazar los `page.drawText` de los 7 campos por llamadas a `drawLabeledValue` (manteniendo `fontBold` para `totalAmount`, con label en `font` regular del mismo `size`).
- No tocar N. de factura ni el historial (ya tienen labels/encabezados).

## Verificación
- `npm run build --workspace=@otb/server` + `npm run lint`.
- Nota: no se puede inspeccionar el template PDF; las posiciones de los labels se calculan relativas al valor, el usuario puede ajustar coordenadas/offset después.