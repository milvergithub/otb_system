/**
 * English catalogue — the source language for every server-side message.
 *
 * Keys under `errors` are exactly the values of `ErrorCode` in
 * `src/common/errors/error-codes.ts`; `errorKey()` derives the lookup path from
 * the wire `code`, so a code and its catalogue entry cannot drift apart.
 *
 * Placeholders use `{{name}}`, matching i18next in the React app so both
 * catalogues read the same.
 */
const en = {
  errors: {
    // ------------------------------------------------------------- auth
    AUTHENTICATION_REQUIRED: 'Authentication required',
    INVALID_CREDENTIALS: 'Invalid credentials',
    INVALID_TOKEN: 'Invalid token',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token',
    ACCOUNT_DISABLED: 'Account is disabled',
    PASSWORD_CHANGE_REQUIRED: 'You must change your password to continue',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
    PASSWORD_REUSED: 'New password must differ from the current one',
    PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
    PASSWORD_TOO_WEAK:
      'Password must be at least 8 characters with an uppercase letter, a lowercase letter, a digit and a symbol',

    // ----------------------------------------------------------- setup
    SETUP_ALREADY_COMPLETED: 'Initial setup has already been completed',
    EMAIL_ALREADY_EXISTS: 'Email already exists',

    // ----------------------------------------------------------- users
    USER_NOT_FOUND: 'User not found',

    // ----------------------------------------------------------- roles
    ROLE_NOT_FOUND: 'Role not found',
    ROLE_NAME_EXISTS: 'Role name already exists',
    CANNOT_MODIFY_SYSTEM_ROLE: 'Cannot modify system role',
    CANNOT_DELETE_SYSTEM_ROLE: 'Cannot delete system role',
    CANNOT_DELETE_ROLE_IN_USE: 'Cannot delete role assigned to users',
    CANNOT_MODIFY_SYSTEM_ROLE_PERMISSIONS:
      'Cannot modify system role permissions',

    // --------------------------------------------------------- members
    MEMBER_NOT_FOUND: 'Member not found',
    MEMBER_CI_EXISTS: 'A member with this CI already exists',
    MEMBER_ALREADY_DELETED: 'This member has already been deleted',
    MEMBER_NOT_DELETED: 'This member is not deleted',
    MEMBER_TYPE_NOT_FOUND: 'Member type not found',
    MEMBER_TYPE_IN_USE: 'Cannot delete a member type that has members assigned',
    MEMBER_TYPE_CODE_REQUIRED: 'The code is required',
    MEMBER_TYPE_CODE_EXISTS: 'A member type with this code already exists',
    MEMBER_TYPE_NAME_REQUIRED: 'The name is required',
    MEMBER_TYPE_NAME_EXISTS: 'A member type with this name already exists',
    MEMBER_TYPE_INACTIVE: 'An inactive member type cannot be assigned',
    IMPORT_CSV_EMPTY: 'The CSV file is empty',
    IMPORT_CSV_INVALID: 'The CSV file has an invalid format',

    // ---------------------------------------------------------- meters
    METER_NOT_FOUND: 'Meter not found',
    METER_CODE_EXISTS: 'A meter with this code already exists',
    METER_TYPE_NOT_FOUND: 'Meter type not found',
    METER_TYPE_NAME_EXISTS: 'A meter type with this name already exists',
    METER_TYPE_CODE_REQUIRED: 'The code is required',
    METER_TYPE_CODE_EXISTS: 'A meter type with this code already exists',

    // ----------------------------------------------------- consumption
    CONSUMPTION_NOT_FOUND: 'Consumption record not found',
    CONSUMPTION_EXISTS:
      'A consumption record already exists for this meter and period',
    CONSUMPTION_HAS_BILL:
      'Cannot delete a consumption record that has a generated bill',
    CURRENT_READING_LOWER:
      'Current reading cannot be lower than the previous reading',

    // --------------------------------------------------------- billing
    NO_VALID_BASE_TARIFF: 'No valid base tariff for {{date}}',
    NO_VALID_TARIFF: 'No valid tariff for {{cubicMeters}} m³ on {{date}}',
    PAYMENT_NOT_FOUND: 'Payment not found',
    PAYMENT_RECORD_NOT_FOUND: 'Payment record not found',
    BILL_ALREADY_EXISTS: 'A bill already exists for this consumption',
    BILL_FULLY_PAID: 'This bill has already been fully paid',
    BILL_PAID_OR_EXCEEDS_BALANCE:
      'This bill was already paid or the amount exceeds its remaining balance',
    PAYMENT_EXCEEDS_BALANCE: 'Payment amount exceeds the remaining balance',

    // -------------------------------------------------------- discount
    DISCOUNT_NOT_FOUND: 'Discount not found',
    DISCOUNT_NAME_EXISTS: 'Discount name already exists',
    SURCHARGE_NOT_FOUND: 'Surcharge not found',
    SURCHARGE_NAME_EXISTS: 'Surcharge name already exists',

    // --------------------------------------------------------- tariffs
    TARIFF_NOT_FOUND: 'Tariff not found',
    BASE_TARIFF_NOT_FOUND: 'Base tariff not found',
    OVERLAPPING_TARIFF:
      'The range {{min}}-{{max}} m³ overlaps the existing tariff "{{name}}" ({{existingMin}}-{{existingMax}} m³)',
    OVERLAPPING_BASE_TARIFF:
      'A base tariff already exists for this period: "{{name}}"',
    END_DATE_AFTER_START: 'End date must be after the start date',
    MAX_CUBIC_METERS_GREATER_THAN_MIN:
      'The maximum must be greater than the minimum',

    // ---------------------------------------------------------- shares
    WATER_SHARE_NOT_FOUND: 'Water share not found',
    SHARE_PAYMENT_NOT_FOUND: 'Share payment record not found',
    OVERLAPPING_WATER_SHARE:
      'A water share already exists for this period: "{{name}}"',

    // ----------------------------------------------------------- zones
    ZONE_NOT_FOUND: 'Zone not found',
    ZONE_TYPE_NOT_FOUND: 'Zone type not found',
    ZONE_TYPE_NAME_EXISTS: 'A zone type with this name already exists',

    // ------------------------------------------------------ activities
    ACTIVITY_NOT_FOUND: 'Activity not found',
    ACTIVITY_TYPE_NOT_FOUND: 'Activity type not found',
    ACTIVITY_TYPE_CODE_REQUIRED: 'The code is required',
    ACTIVITY_TYPE_CODE_EXISTS: 'An activity type with this code already exists',
    ACTIVITY_STATUS_TRANSITION_INVALID:
      'The status cannot be changed from "{{from}}" to "{{to}}"',
    ACTIVITY_NOT_MODIFIABLE:
      'Only the creator or the responsible user can modify this activity',
    ACTIVITY_END_TIME_AFTER_START: 'The end time must be after the start time',
    ACTIVITY_ORGANIZER_NOT_FOUND: 'The organizer user was not found',
    ACTIVITY_COLLECTOR_NOT_FOUND:
      'The user in charge of collecting fines was not found',
    ACTIVITY_EVIDENCE_NOT_FOUND: 'Evidence not found',
    ACTIVITY_EVIDENCE_ONLY_IMAGES_AND_PDF: 'Only images and PDF are allowed',
    ACTIVITY_EVIDENCE_STORAGE_UNAVAILABLE:
      'The evidence storage is not available',
    ACTIVITY_EVIDENCE_UPLOAD_FAILED: 'The file could not be saved',
    ATTENDANCE_INITIAL_CONTROL_LOCKED:
      'The initial attendance control cannot be edited once the final control has been recorded',
    ATTENDANCE_INITIAL_CONTROL_REQUIRED:
      'The initial attendance control must be recorded first',

    // ----------------------------------------------------------- fines
    FINE_NOT_FOUND: 'Fine not found',
    FINES_NOT_FOUND: 'No fines were found',
    FINE_TYPE_NOT_FOUND: 'Fine type not found',
    FINE_TYPE_CODE_EXISTS: 'An active fine type with this code already exists',
    FINE_TYPE_INACTIVE: 'The fine type is inactive',
    FINE_AMOUNT_INVALID: 'The fine amount is invalid',
    FINE_ALREADY_PAID: 'This fine has already been paid',
    FINE_ALREADY_CANCELLED: 'This fine has already been cancelled',
    FINE_STATE_CHANGED:
      'The fine changed state while the payment was being processed',

    // ---------------------------------------------------------- assets
    ASSET_NOT_FOUND: 'Asset not found',
    ASSET_CATEGORY_NOT_FOUND: 'Asset category not found',
    ASSET_CATEGORY_NAME_EXISTS:
      'An asset category with name "{{name}}" already exists',
    ASSET_CATEGORY_IN_USE:
      'Cannot delete asset category "{{name}}" because it is assigned to {{count}} asset(s). Deactivate it instead.',
    ASSET_LOCATION_NOT_FOUND: 'Asset location not found',
    ASSET_LOCATION_NAME_EXISTS:
      'An asset location with name "{{name}}" already exists',
    ASSET_LOCATION_IN_USE:
      'Cannot delete asset location "{{name}}" because {{count}} asset(s) are stored there. Deactivate it instead.',
    ASSET_CODES_TAKEN:
      'Asset codes were already taken, please retry the bulk creation',
    ASSET_RETIRED_CANNOT_EDIT:
      'A retired asset cannot be edited. Restore it first.',
    ASSET_HAS_HISTORY_CANNOT_DELETE:
      'Assets with movement or maintenance history cannot be deleted. Retire the asset instead.',
    ASSET_RETIRED_CANNOT_LOAN: 'A retired asset cannot be loaned',
    ASSET_LOAN_ALREADY_OPEN: 'This asset already has an open loan',
    ASSET_LOAN_REQUIRES_RESPONSIBLE:
      'A loan requires a responsible user or member',
    ASSET_NO_OPEN_LOAN: 'This asset has no open loan',
    ASSET_RETIRED_CANNOT_RETURN: 'A retired asset cannot be returned',
    ASSET_RETIRED_CANNOT_TRANSFER: 'A retired asset cannot be transferred',
    ASSET_RETURN_BEFORE_LOCATION_CHANGE:
      'Return the asset before changing its location',
    ASSET_SAME_LOCATION:
      'The destination location is already the current location',
    ASSET_ALREADY_LOST: 'This asset is already marked as lost',
    ASSET_RETIRED_CANNOT_MARK_LOST: 'A retired asset cannot be marked as lost',
    ASSET_RETURN_BEFORE_MARK_LOST: 'Return the asset before marking it as lost',
    ASSET_ALREADY_RETIRED: 'This asset is already retired',
    ASSET_RETURN_BEFORE_RETIRE: 'Return the asset before retiring it',
    ASSET_MAINTENANCE_BLOCKS_LOAN:
      'Finish the maintenance before loaning this asset',
    ASSET_MAINTENANCE_BLOCKS_LOST:
      'Finish the maintenance before marking it as lost',
    ASSET_MAINTENANCE_BLOCKS_RETIRE:
      'Finish the maintenance before retiring this asset',
    ASSET_ONLY_RETIRED_CAN_RESTORE: 'Only retired assets can be restored',
    ASSET_RETIRED_CANNOT_MAINTENANCE:
      'A retired asset cannot be sent to maintenance',
    ASSET_RETURN_BEFORE_MAINTENANCE:
      'Return the asset before sending it to maintenance',
    ASSET_LOST_CANNOT_MAINTENANCE: 'A lost asset cannot be sent to maintenance',
    ASSET_MAINTENANCE_ALREADY_OPEN:
      'This asset already has an open maintenance',
    ASSET_MAINTENANCE_NOT_FOUND: 'Asset maintenance not found',
    ASSET_MAINTENANCE_ALREADY_CLOSED: 'This maintenance is already closed',
    ASSET_DOCUMENT_NOT_FOUND: 'Asset document not found',
    ASSET_CODE_GENERATION_FAILED: 'Could not generate a unique asset code',
    ASSET_RESPONSIBLE_CONFLICT:
      'An asset can only have one responsible party at a time',

    // --------------------------------------------------- contributions
    CONTRIBUTION_NOT_FOUND: 'Contribution not found',
    CONTRIBUTION_FORBIDDEN:
      'You do not have permission to view this contribution',
    CONTRIBUTION_NOT_MODIFIABLE:
      'Only the creator or the responsible user can modify this contribution',
    CONTRIBUTION_STATUS_TRANSITION_INVALID:
      'The status cannot be changed from "{{from}}" to "{{to}}"',
    CONTRIBUTION_RESPONSIBLE_NOT_FOUND: 'The responsible user was not found',
    CONTRIBUTION_COLLECTOR_NOT_FOUND: 'The collector user was not found',
    CONTRIBUTION_AMOUNT_LOCKED:
      'The amount per member cannot be modified once the contribution is activated',
    CONTRIBUTION_RESPONSIBLE_LOCKED:
      'The collector and the responsible user can only be changed while the contribution is a draft',
    CONTRIBUTION_ONLY_DRAFT_DELETABLE:
      'Only contributions in draft can be deleted',
    CONTRIBUTION_HAS_OBLIGATIONS:
      'The contribution has registered obligations and cannot be deleted',
    CONTRIBUTION_COLLECTOR_REQUIRED:
      'You must assign a collector before activating the contribution',
    CONTRIBUTION_RENDERER_REQUIRED:
      'You must assign a responsible user before activating the contribution',
    CONTRIBUTION_REQUIRES_MEMBERS:
      'You must include at least one member before activating the contribution',
    CONTRIBUTION_PENDING_OBLIGATIONS:
      'Cannot finish: there are pending or partially paid obligations',
    CONTRIBUTION_MEMBERS_NOT_ADDABLE:
      'Members cannot be added to a finished or cancelled contribution',
    CONTRIBUTION_SELECT_MEMBERS: 'Select at least one member',
    CONTRIBUTION_MEMBERS_NOT_FOUND: 'One or more members do not exist',
    CONTRIBUTION_NOT_COLLECTABLE:
      'The contribution is not enabled for collection in its current state',
    CONTRIBUTION_PAYMENT_NOT_FOUND: 'Payment not found',
    CONTRIBUTION_PAYMENT_ALREADY_VOIDED: 'This payment has already been voided',
    CONTRIBUTION_EVIDENCE_UPLOAD_FAILED: 'The file could not be saved',
    OBLIGATION_NOT_FOUND: 'Obligation not found',
    OBLIGATION_NOT_EXONERABLE:
      'The obligation cannot be exonerated in its current state',
    OBLIGATION_ALREADY_CANCELLED: 'The obligation has already been cancelled',
    OBLIGATION_PAID_CANNOT_CANCEL:
      'The obligation is paid and cannot be cancelled',
    OBLIGATION_HAS_PAYMENTS:
      'The obligation has payments or an exoneration: resolve that first',
    OBLIGATION_EXONERATED: 'The obligation is exonerated',
    OBLIGATION_CANCELLED: 'The obligation was cancelled',
    OBLIGATION_EXCEEDS_BALANCE:
      'The amount exceeds the outstanding balance ({{balance}} Bs)',
    OBLIGATION_STATE_CHANGED:
      'The obligation changed state while the payment was being processed',

    // -------------------------------------------------------- finances
    FINANCE_TRANSACTION_NOT_FOUND: 'Transaction not found',
    FINANCE_TRANSACTION_FORBIDDEN:
      'You do not have permission to view this transaction',
    FINANCE_TRANSACTION_VOIDED: 'Transaction is already voided',
    FINANCE_RESPONSIBLE_REQUIRES_ALL_PERMISSION:
      'Only a user with the finances.all permission can be assigned as financial responsible',
    FINANCE_CATEGORY_NOT_FOUND: 'Finance category not found',
    FINANCE_CATEGORY_IN_USE:
      'Cannot delete category "{{name}}" because it is used by {{count}} transaction(s). Deactivate it instead.',
    FINANCE_CATEGORY_NAME_EXISTS:
      'A finance category with name "{{name}}" already exists',
    FINANCE_DOCUMENT_NOT_FOUND: 'Finance document not found',
    FINANCE_SOURCE_ID_REQUIRED:
      'sourceId is required when sourceType is {{sourceType}}',

    // ---------------------------------------------------- payment methods
    PAYMENT_METHOD_NOT_FOUND: 'Payment method "{{code}}" not found',
    PAYMENT_METHOD_CODE_REQUIRED: 'The code is required',
    PAYMENT_METHOD_CODE_EXISTS:
      'A payment method with this code already exists',
    PAYMENT_METHOD_NAME_EXISTS:
      'A payment method with the name "{{name}}" already exists',
    PAYMENT_METHOD_IN_USE:
      'This payment method has payments recorded and cannot be deleted',

    // --------------------------------------------------------- generic
    VALIDATION_ERROR: 'The submitted data is invalid',
    DOCUMENT_UPLOAD_FAILED: 'Could not store the uploaded document',
    INTERNAL_ERROR: 'An unexpected error occurred',
  },

  /**
   * One entry per class-validator constraint used in this codebase. Keyed by
   * the constraint name class-validator reports, so the ~400 DTO decorators
   * that carry no explicit `message` still answer in the request language.
   */
  validation: {
    isString: '{{property}} must be text',
    isNumber: '{{property}} must be a number',
    isInt: '{{property}} must be a whole number',
    isPositive: '{{property}} must be greater than zero',
    isBoolean: '{{property}} must be true or false',
    isEmail: '{{property}} must be a valid email address',
    isUuid: '{{property}} must be a valid identifier',
    isDateString: '{{property}} must be a valid ISO 8601 date',
    isArray: '{{property}} must be a list',
    arrayNotEmpty: '{{property}} must not be empty',
    isNotEmpty: '{{property}} must not be empty',
    isEnum: '{{property}} must be one of the allowed values',
    isIn: '{{property}} must be one of the allowed values',
    minLength: '{{property}} must be at least {{min}} characters',
    maxLength: '{{property}} must be at most {{max}} characters',
    min: '{{property}} must not be less than {{min}}',
    max: '{{property}} must not be greater than {{max}}',
    matches: '{{property}} has an invalid format',
    match: '{{property}} must match the other field',
    isStrongPassword:
      'Password must be at least 8 characters with an uppercase letter, a lowercase letter, a digit and a symbol',
    nestedValidation: '{{property}} is invalid',
  },
} as const;

export default en;
