/**
 * Spanish catalogue. Every key mirrors `src/locales/en.ts` one-to-one;
 * `src/common/errors/error-codes.spec.ts` enforces that.
 *
 * Wording follows the Spanish strings already shipped in
 * `packages/client/src/locales/es.json` so the UI keeps reading the same way
 * whether a message comes from the API or from React.
 */
const es = {
  errors: {
    // ------------------------------------------------------------- auth
    AUTHENTICATION_REQUIRED: 'Debes iniciar sesión',
    INVALID_CREDENTIALS: 'Credenciales inválidas',
    INVALID_TOKEN: 'Token inválido',
    INVALID_REFRESH_TOKEN: 'Token de renovación inválido',
    ACCOUNT_DISABLED: 'Cuenta desactivada',
    PASSWORD_CHANGE_REQUIRED: 'Debes cambiar tu contraseña para continuar',
    INSUFFICIENT_PERMISSIONS: 'Permisos insuficientes',
    CURRENT_PASSWORD_INCORRECT: 'La contraseña actual es incorrecta',
    PASSWORD_REUSED: 'La nueva contraseña debe ser distinta a la actual',
    PASSWORDS_DO_NOT_MATCH: 'Las contraseñas no coinciden',
    PASSWORD_TOO_WEAK:
      'La contraseña debe tener al menos 8 caracteres con una mayúscula, una minúscula, un número y un símbolo',

    // ----------------------------------------------------------- setup
    SETUP_ALREADY_COMPLETED: 'La configuración inicial ya fue completada',
    EMAIL_ALREADY_EXISTS: 'El correo electrónico ya existe',

    // ----------------------------------------------------------- users
    USER_NOT_FOUND: 'Usuario no encontrado',

    // ----------------------------------------------------------- roles
    ROLE_NOT_FOUND: 'Rol no encontrado',
    ROLE_NAME_EXISTS: 'Ya existe un rol con este nombre',
    CANNOT_MODIFY_SYSTEM_ROLE: 'No se puede modificar un rol del sistema',
    CANNOT_DELETE_SYSTEM_ROLE: 'No se puede eliminar un rol del sistema',
    CANNOT_DELETE_ROLE_IN_USE:
      'No se puede eliminar un rol asignado a usuarios',
    CANNOT_MODIFY_SYSTEM_ROLE_PERMISSIONS:
      'No se pueden modificar los permisos de un rol del sistema',

    // --------------------------------------------------------- members
    MEMBER_NOT_FOUND: 'Socio no encontrado',
    MEMBER_CI_EXISTS: 'Ya existe un socio con este CI',
    MEMBER_ALREADY_DELETED: 'Este socio ya fue eliminado',
    MEMBER_NOT_DELETED: 'Este socio no está eliminado',
    MEMBER_TYPE_NOT_FOUND: 'Tipo de socio no encontrado',
    MEMBER_TYPE_IN_USE:
      'No se puede eliminar un tipo de socio con socios asignados',
    MEMBER_TYPE_CODE_REQUIRED: 'El código es obligatorio',
    MEMBER_TYPE_CODE_EXISTS: 'Ya existe un tipo de socio con ese código',
    MEMBER_TYPE_NAME_REQUIRED: 'El nombre es obligatorio',
    MEMBER_TYPE_NAME_EXISTS: 'Ya existe un tipo de socio con ese nombre',
    MEMBER_TYPE_INACTIVE: 'No se puede asignar un tipo de socio inactivo',
    IMPORT_CSV_EMPTY: 'El archivo CSV está vacío',
    IMPORT_CSV_INVALID: 'El archivo CSV tiene un formato inválido',

    // ---------------------------------------------------------- meters
    METER_NOT_FOUND: 'Medidor no encontrado',
    METER_CODE_EXISTS: 'Ya existe un medidor con este código',
    METER_TYPE_NOT_FOUND: 'Tipo de medidor no encontrado',
    METER_TYPE_NAME_EXISTS: 'Ya existe un tipo de medidor con este nombre',
    METER_TYPE_CODE_REQUIRED: 'El código es obligatorio',
    METER_TYPE_CODE_EXISTS: 'Ya existe un tipo de medidor con ese código',

    // ----------------------------------------------------- consumption
    CONSUMPTION_NOT_FOUND: 'Registro de consumo no encontrado',
    CONSUMPTION_EXISTS:
      'Ya existe un registro de consumo para este medidor y período',
    CONSUMPTION_HAS_BILL:
      'No se puede eliminar un registro de consumo que ya tiene una factura generada',
    CURRENT_READING_LOWER:
      'La lectura actual no puede ser menor a la lectura anterior',

    // --------------------------------------------------------- billing
    NO_VALID_BASE_TARIFF: 'No hay una tarifa base vigente para {{date}}',
    NO_VALID_TARIFF:
      'No hay una tarifa vigente para {{cubicMeters}} m³ el {{date}}',
    PAYMENT_NOT_FOUND: 'Pago no encontrado',
    PAYMENT_RECORD_NOT_FOUND: 'Registro de pago no encontrado',
    BILL_ALREADY_EXISTS: 'Ya existe una factura para este consumo',
    BILL_FULLY_PAID: 'Esta factura ya ha sido pagada por completo',
    BILL_PAID_OR_EXCEEDS_BALANCE:
      'Esta factura ya fue pagada o el monto supera su saldo pendiente',
    PAYMENT_EXCEEDS_BALANCE: 'El monto del pago supera el saldo pendiente',

    // -------------------------------------------------------- discount
    DISCOUNT_NOT_FOUND: 'Descuento no encontrado',
    DISCOUNT_NAME_EXISTS: 'Ya existe un descuento con este nombre',
    SURCHARGE_NOT_FOUND: 'Recargo no encontrado',
    SURCHARGE_NAME_EXISTS: 'Ya existe un recargo con este nombre',

    // --------------------------------------------------------- tariffs
    TARIFF_NOT_FOUND: 'Tarifa no encontrada',
    BASE_TARIFF_NOT_FOUND: 'Tarifa base no encontrada',
    OVERLAPPING_TARIFF:
      'El rango {{min}}-{{max}} m³ se superpone con la tarifa existente "{{name}}" ({{existingMin}}-{{existingMax}} m³)',
    OVERLAPPING_BASE_TARIFF:
      'Ya existe una tarifa base vigente para este período: "{{name}}"',
    END_DATE_AFTER_START:
      'La fecha de fin debe ser posterior a la fecha de inicio',
    MAX_CUBIC_METERS_GREATER_THAN_MIN: 'El máximo debe ser mayor que el mínimo',

    // ---------------------------------------------------------- shares
    WATER_SHARE_NOT_FOUND: 'Acción de agua no encontrada',
    SHARE_PAYMENT_NOT_FOUND: 'Registro de pago de acción de agua no encontrado',
    OVERLAPPING_WATER_SHARE:
      'Ya existe una acción de agua vigente para este período: "{{name}}"',

    // ----------------------------------------------------------- zones
    ZONE_NOT_FOUND: 'Zona no encontrada',
    ZONE_TYPE_NOT_FOUND: 'Tipo de zona no encontrado',
    ZONE_TYPE_NAME_EXISTS: 'Ya existe un tipo de zona con este nombre',

    // ------------------------------------------------------ activities
    ACTIVITY_NOT_FOUND: 'Actividad no encontrada',
    ACTIVITY_TYPE_NOT_FOUND: 'Tipo de actividad no encontrado',
    ACTIVITY_TYPE_CODE_REQUIRED: 'El código es obligatorio',
    ACTIVITY_TYPE_CODE_EXISTS: 'Ya existe un tipo de actividad con ese código',
    ACTIVITY_STATUS_TRANSITION_INVALID:
      'No se puede cambiar el estado de "{{from}}" a "{{to}}"',
    ACTIVITY_NOT_MODIFIABLE:
      'Solo el creador o el responsable puede modificar esta actividad',
    ACTIVITY_END_TIME_AFTER_START:
      'La hora de fin debe ser posterior a la hora de inicio',
    ACTIVITY_ORGANIZER_NOT_FOUND: 'No se encontró el usuario responsable',
    ACTIVITY_COLLECTOR_NOT_FOUND:
      'No se encontró el usuario encargado de cobrar las multas',
    ACTIVITY_EVIDENCE_NOT_FOUND: 'Evidencia no encontrada',
    ACTIVITY_EVIDENCE_ONLY_IMAGES_AND_PDF: 'Solo se permiten imágenes y PDF',
    ACTIVITY_EVIDENCE_STORAGE_UNAVAILABLE:
      'El almacenamiento de evidencias no está disponible',
    ACTIVITY_EVIDENCE_UPLOAD_FAILED: 'No se pudo guardar el archivo',
    ATTENDANCE_INITIAL_CONTROL_LOCKED:
      'El control inicial no puede modificarse una vez realizado el control final',
    ATTENDANCE_INITIAL_CONTROL_REQUIRED:
      'Debe realizarse primero el control de asistencia inicial',

    // ----------------------------------------------------------- fines
    FINE_NOT_FOUND: 'Multa no encontrada',
    FINES_NOT_FOUND: 'No se encontraron multas',
    FINE_TYPE_NOT_FOUND: 'Tipo de multa no encontrado',
    FINE_TYPE_CODE_EXISTS: 'Ya existe un tipo de multa activo con ese código',
    FINE_TYPE_INACTIVE: 'El tipo de multa está inactivo',
    FINE_AMOUNT_INVALID: 'El monto de la multa es inválido',
    FINE_ALREADY_PAID: 'La multa ya fue pagada',
    FINE_ALREADY_CANCELLED: 'La multa ya fue cancelada',
    FINE_STATE_CHANGED:
      'La multa cambió de estado mientras se procesaba el pago',

    // ---------------------------------------------------------- assets
    ASSET_NOT_FOUND: 'Activo no encontrado',
    ASSET_CATEGORY_NOT_FOUND: 'Categoría de activo no encontrada',
    ASSET_CATEGORY_NAME_EXISTS:
      'Ya existe una categoría de activo con el nombre "{{name}}"',
    ASSET_CATEGORY_IN_USE:
      'No se puede eliminar la categoría de activo "{{name}}" porque está asignada a {{count}} activo(s). Desactívala en su lugar.',
    ASSET_LOCATION_NOT_FOUND: 'Ubicación de activo no encontrada',
    ASSET_LOCATION_NAME_EXISTS:
      'Ya existe una ubicación de activo con el nombre "{{name}}"',
    ASSET_LOCATION_IN_USE:
      'No se puede eliminar la ubicación de activo "{{name}}" porque hay {{count}} activo(s) almacenados allí. Desactívala en su lugar.',
    ASSET_CODES_TAKEN:
      'Los códigos de activo ya estaban en uso, vuelve a intentar la creación masiva',
    ASSET_RETIRED_CANNOT_EDIT:
      'No se puede editar un activo dado de baja. Restáuralo primero.',
    ASSET_HAS_HISTORY_CANNOT_DELETE:
      'No se pueden eliminar activos con historial de movimientos o mantenimiento. Da de baja el activo en su lugar.',
    ASSET_RETIRED_CANNOT_LOAN: 'No se puede prestar un activo dado de baja',
    ASSET_LOAN_ALREADY_OPEN: 'Este activo ya tiene un préstamo abierto',
    ASSET_LOAN_REQUIRES_RESPONSIBLE:
      'Un préstamo requiere un usuario o socio responsable',
    ASSET_NO_OPEN_LOAN: 'Este activo no tiene un préstamo abierto',
    ASSET_RETIRED_CANNOT_RETURN: 'No se puede devolver un activo dado de baja',
    ASSET_RETIRED_CANNOT_TRANSFER:
      'No se puede transferir un activo dado de baja',
    ASSET_RETURN_BEFORE_LOCATION_CHANGE:
      'Devuelve el activo antes de cambiar su ubicación',
    ASSET_SAME_LOCATION: 'La ubicación de destino ya es la ubicación actual',
    ASSET_ALREADY_LOST: 'Este activo ya está marcado como extraviado',
    ASSET_RETIRED_CANNOT_MARK_LOST:
      'No se puede marcar como extraviado un activo dado de baja',
    ASSET_RETURN_BEFORE_MARK_LOST:
      'Devuelve el activo antes de marcarlo como extraviado',
    ASSET_ALREADY_RETIRED: 'Este activo ya está dado de baja',
    ASSET_RETURN_BEFORE_RETIRE: 'Devuelve el activo antes de darlo de baja',
    ASSET_MAINTENANCE_BLOCKS_LOAN:
      'Finaliza el mantenimiento antes de prestar este activo',
    ASSET_MAINTENANCE_BLOCKS_LOST:
      'Finaliza el mantenimiento antes de marcarlo como extraviado',
    ASSET_MAINTENANCE_BLOCKS_RETIRE:
      'Finaliza el mantenimiento antes de dar de baja este activo',
    ASSET_ONLY_RETIRED_CAN_RESTORE:
      'Solo los activos dados de baja pueden restaurarse',
    ASSET_RETIRED_CANNOT_MAINTENANCE:
      'No se puede enviar a mantenimiento un activo dado de baja',
    ASSET_RETURN_BEFORE_MAINTENANCE:
      'Devuelve el activo antes de enviarlo a mantenimiento',
    ASSET_LOST_CANNOT_MAINTENANCE:
      'No se puede enviar a mantenimiento un activo extraviado',
    ASSET_MAINTENANCE_ALREADY_OPEN:
      'Este activo ya tiene un mantenimiento abierto',
    ASSET_MAINTENANCE_NOT_FOUND: 'Mantenimiento de activo no encontrado',
    ASSET_MAINTENANCE_ALREADY_CLOSED: 'Este mantenimiento ya fue cerrado',
    ASSET_DOCUMENT_NOT_FOUND: 'Documento del activo no encontrado',
    ASSET_CODE_GENERATION_FAILED:
      'No se pudo generar un código de activo único',
    ASSET_RESPONSIBLE_CONFLICT:
      'Un activo solo puede tener un responsable a la vez',

    // --------------------------------------------------- contributions
    CONTRIBUTION_NOT_FOUND: 'Aporte no encontrado',
    CONTRIBUTION_FORBIDDEN: 'No tiene permiso para consultar este aporte',
    CONTRIBUTION_NOT_MODIFIABLE:
      'Solo el creador o el responsable puede modificar este aporte',
    CONTRIBUTION_STATUS_TRANSITION_INVALID:
      'No se puede cambiar el estado de "{{from}}" a "{{to}}"',
    CONTRIBUTION_RESPONSIBLE_NOT_FOUND: 'No se encontró el usuario responsable',
    CONTRIBUTION_COLLECTOR_NOT_FOUND: 'No se encontró el usuario cobrador',
    CONTRIBUTION_AMOUNT_LOCKED:
      'El monto por socio no puede modificarse una vez activado el aporte',
    CONTRIBUTION_RESPONSIBLE_LOCKED:
      'El cobrador y el responsable solo se modifican en borrador',
    CONTRIBUTION_ONLY_DRAFT_DELETABLE:
      'Solo los aportes en borrador pueden eliminarse',
    CONTRIBUTION_HAS_OBLIGATIONS:
      'El aporte tiene obligaciones registradas y no puede eliminarse',
    CONTRIBUTION_COLLECTOR_REQUIRED:
      'Debe asignar un cobrador antes de activar el aporte',
    CONTRIBUTION_RENDERER_REQUIRED:
      'Debe asignar un responsable de rendición antes de activar el aporte',
    CONTRIBUTION_REQUIRES_MEMBERS:
      'Debe incluir al menos un socio antes de activar el aporte',
    CONTRIBUTION_PENDING_OBLIGATIONS:
      'No se puede finalizar: existen obligaciones pendientes o parciales',
    CONTRIBUTION_MEMBERS_NOT_ADDABLE:
      'No se pueden incorporar socios a un aporte finalizado o cancelado',
    CONTRIBUTION_SELECT_MEMBERS: 'Debe seleccionar al menos un socio',
    CONTRIBUTION_MEMBERS_NOT_FOUND: 'Uno o más socios no existen',
    CONTRIBUTION_NOT_COLLECTABLE:
      'El aporte no está habilitado para cobrar en este estado',
    CONTRIBUTION_PAYMENT_NOT_FOUND: 'Pago no encontrado',
    CONTRIBUTION_PAYMENT_ALREADY_VOIDED: 'El pago ya fue anulado',
    CONTRIBUTION_EVIDENCE_UPLOAD_FAILED: 'No se pudo guardar el archivo',
    OBLIGATION_NOT_FOUND: 'Obligación no encontrada',
    OBLIGATION_NOT_EXONERABLE:
      'La obligación no puede exonerarse en su estado actual',
    OBLIGATION_ALREADY_CANCELLED: 'La obligación ya fue cancelada',
    OBLIGATION_PAID_CANNOT_CANCEL:
      'La obligación está pagada y no puede cancelarse',
    OBLIGATION_HAS_PAYMENTS:
      'La obligación tiene pagos o exoneración: resuelva primero esa situación',
    OBLIGATION_EXONERATED: 'La obligación está exonerada',
    OBLIGATION_CANCELLED: 'La obligación fue cancelada',
    OBLIGATION_EXCEEDS_BALANCE:
      'El monto excede el saldo pendiente ({{balance}} Bs)',
    OBLIGATION_STATE_CHANGED:
      'La obligación cambió de estado mientras se procesaba el pago',

    // -------------------------------------------------------- finances
    FINANCE_TRANSACTION_NOT_FOUND: 'Movimiento no encontrado',
    FINANCE_TRANSACTION_FORBIDDEN:
      'No tiene permiso para consultar este movimiento',
    FINANCE_TRANSACTION_VOIDED: 'El movimiento ya fue anulado',
    FINANCE_RESPONSIBLE_REQUIRES_ALL_PERMISSION:
      'Solo puede asignar como responsable financiero a un usuario con permiso finances.all',
    FINANCE_CATEGORY_NOT_FOUND: 'Categoría de movimiento no encontrada',
    FINANCE_CATEGORY_IN_USE:
      'No se puede eliminar la categoría "{{name}}" porque la usan {{count}} movimiento(s). Desactívala en su lugar.',
    FINANCE_CATEGORY_NAME_EXISTS:
      'Ya existe una categoría de movimiento con el nombre "{{name}}"',
    FINANCE_DOCUMENT_NOT_FOUND: 'Documento del movimiento no encontrado',
    FINANCE_SOURCE_ID_REQUIRED:
      'sourceId es obligatorio cuando sourceType es {{sourceType}}',

    // ---------------------------------------------------- payment methods
    PAYMENT_METHOD_NOT_FOUND: 'Método de pago "{{code}}" no encontrado',
    PAYMENT_METHOD_CODE_REQUIRED: 'El código es obligatorio',
    PAYMENT_METHOD_CODE_EXISTS: 'Ya existe un método de pago con ese código',
    PAYMENT_METHOD_NAME_EXISTS:
      'Ya existe un método de pago con el nombre "{{name}}"',
    PAYMENT_METHOD_IN_USE:
      'Este método de pago tiene pagos registrados y no se puede eliminar',

    // --------------------------------------------------------- generic
    VALIDATION_ERROR: 'Los datos enviados no son válidos',
    DOCUMENT_UPLOAD_FAILED: 'No se pudo guardar el archivo enviado',
    INTERNAL_ERROR: 'Ocurrió un error inesperado',
  },

  validation: {
    isString: '{{property}} debe ser texto',
    isNumber: '{{property}} debe ser un número',
    isInt: '{{property}} debe ser un número entero',
    isPositive: '{{property}} debe ser mayor que cero',
    isBoolean: '{{property}} debe ser verdadero o falso',
    isEmail: '{{property}} debe ser un correo electrónico válido',
    isUuid: '{{property}} debe ser un identificador válido',
    isDateString: '{{property}} debe ser una fecha ISO 8601 válida',
    isArray: '{{property}} debe ser una lista',
    arrayNotEmpty: '{{property}} no puede estar vacía',
    isNotEmpty: '{{property}} no puede estar vacío',
    isEnum: '{{property}} debe ser uno de los valores permitidos',
    isIn: '{{property}} debe ser uno de los valores permitidos',
    minLength: '{{property}} debe tener al menos {{min}} caracteres',
    maxLength: '{{property}} debe tener como máximo {{max}} caracteres',
    min: '{{property}} no puede ser menor que {{min}}',
    max: '{{property}} no puede ser mayor que {{max}}',
    matches: '{{property}} tiene un formato inválido',
    match: '{{property}} no coincide con el otro campo',
    isStrongPassword:
      'La contraseña debe tener al menos 8 caracteres con una mayúscula, una minúscula, un número y un símbolo',
    nestedValidation: '{{property}} es inválido',
  },
} as const;

export default es;
