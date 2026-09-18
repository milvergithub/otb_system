# Pago masivo de multas (bulk pay)

## Objetivo
En `/fines/:memberId`, al seleccionar varios registros con status `pending`, habilitar arriba un botón "Pagar todos los seleccionados" que las paga todas de una vez (con diálogo de confirmación y notas opcionales, aprobado por el usuario).

## Server

### 1. `packages/server/src/modules/activities/dto/fine.dto.ts`
Agregar `BulkPayFinesDto`:
```ts
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class BulkPayFinesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### 2. `packages/server/src/modules/activities/fines.service.ts`
Agregar `bulkPay` (solo paga las `pending`, ignora las demás):
```ts
async bulkPay(ids: string[], notes?: string): Promise<{ paid: number }> {
  const values: Partial<Fine> = { status: FineStatus.PAID, paid_at: new Date() };
  if (notes) values.notes = notes;
  const result = await this.repo
    .createQueryBuilder()
    .update(Fine)
    .set(values)
    .where('id IN (:...ids)', { ids })
    .andWhere('status = :status', { status: FineStatus.PENDING })
    .execute();
  return { paid: result.affected ?? 0 };
}
```

### 3. `packages/server/src/modules/activities/fines.controller.ts`
Agregar ruta (sin conflicto con `:id/pay`):
```ts
@Patch('bulk-pay')
@Roles('activities.update')
bulkPay(@Body() dto: BulkPayFinesDto) {
  return this.service.bulkPay(dto.ids, dto.notes);
}
```
Actualizar import a `import { PayFineDto, CancelFineDto, BulkPayFinesDto } from './dto/fine.dto';`.

## Client

### 4. `packages/client/src/lib/apiPath.ts`
Agregar en `Fines`:
```ts
BULK_PAY: "/fines/bulk-pay",
```

### 5. `packages/client/src/hooks/activities.ts`
Agregar `usePayFinesBulk` (patrón de `usePayFine`):
```ts
export function usePayFinesBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, notes }: { ids: string[]; notes?: string }) =>
      api.patch(ApiPath.Fines.BULK_PAY, { ids, notes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}
```

### 6. `packages/client/src/pages/activities/member-fines.tsx`
- Importar `Checkbox` de `@/components/ui/checkbox` y `Loader2` de `lucide-react`.
- Estado nuevo: `selected: Set<string>`, `payBulkOpen: boolean`.
- Derivados: `pendingFines = fines.filter(f => f.status === "pending")`, `selectedFines`, `selectedTotal` (suma de montos formateada).
- Solo las `pending` seleccionables. `toggleSelect`, `toggleSelectAll` (selecciona todas las pending), `allPendingSelected`.
- **Toolbar arriba de la tabla** (visible si `canManage` y hay pending): muestra `t("activities.selected", { count })` y botón "Pagar todos los seleccionados" con `disabled={selected.size === 0 || payBulkMut.isPending}`; al hacer clic abre el diálogo.
- **Columna checkbox**: `<TableHead className="w-12">` con select-all en el header; en cada fila `<td>` con checkbox solo si `f.status === "pending"` (header checkbox disabled si no hay pending).
- **Diálogo de confirmación** (patrón del pago individual): título `payAllSelected`, cuerpo `payAllSelectedConfirm` con `{{count}}` y `{{amount}}`, input de notas, botón ejecuta `handlePayBulk`.
- `handlePayBulk`: `payBulkMut.mutateAsync({ ids: [...selected], notes: bulkNotes || undefined })` → toast `finePaid`, cierra diálogo, limpia `selected` y `bulkNotes`; catch → `getApiErrorMessage`.

### 7. i18n es/en
- `activities.payAllSelected`: "Pagar todos los seleccionados" / "Pay all selected".
- `activities.payAllSelectedConfirm`: "¿Desea marcar como pagadas {{count}} multas por {{amount}}?" / "Mark {{count}} fines totaling {{amount}} as paid?"

## Verificación
`npm run build` + `npm run lint`; smoke test en `fines/:memberId` seleccionando varias pendientes y confirmando el pago (estado $ → `paid`).