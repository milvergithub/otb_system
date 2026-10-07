export type UserRole = "admin" | "user"

export interface Permission {
  id: string
  name: string
  description?: string | null
  resource: string
  action: string
}

export interface Role {
  id: string
  name: string
  description?: string | null
  is_system: boolean
  permissions: Permission[]
  created_at: string
}

export type DiscountType = "fixed" | "percentage"

export interface Discount {
  id: string
  name: string
  type: DiscountType
  value: string
  description?: string | null
  is_active: boolean
  created_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  roles?: Role[]
  permissions?: string[]
  member_id?: string | null
  created_at: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface SetupStatus {
  setupCompleted: boolean
}

export interface CreateInitialAdminRequest {
  fullName: string
  email: string
  password: string
  passwordConfirmation: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Member {
  id: string
  ci: string
  first_name: string
  last_name: string
  phone?: string | null
  phone_country?: string | null
  address?: string | null
  created_at: string
  meters?: Meter[]
}

export interface MeterTypeItem {
  id: string
  code: string
  name: string
  created_at: string
  updated_at: string
}

export type MeterStatus = "active" | "inactive" | "decommissioned"

export interface WaterShare {
  id: string
  name: string
  amount: string
  valid_from: string
  valid_until?: string | null
  is_active: boolean
  created_at: string
}

export interface SharePayment {
  id: string
  meter_id: string
  share_id?: string | null
  share?: WaterShare | null
  amount: string
  payment_method?: PaymentMethod | null
  reference?: string | null
  notes?: string | null
  evidence_key?: string | null
  paid_at: string
  created_at: string
}

export type ShareStatus = "paid" | "partial" | "pending"

export interface Meter {
  id: string
  code: string
  member_id: string
  member?: Member
  address: string
  latitude?: string | null
  longitude?: string | null
  type_id: string
  type?: MeterTypeItem
  status: MeterStatus
  installed_at: string
  created_at: string
  sharePaid?: number
  shareTotal?: number
  shareStatus?: ShareStatus
  consumptions?: Consumption[]
}

export interface Tariff {
  id: string
  name: string
  min_cubic_meters: string
  max_cubic_meters?: string | null
  price_per_cubic_meter: string
  valid_from: string
  valid_until?: string | null
  is_active: boolean
  created_at: string
}

export interface BaseTariff {
  id: string
  name: string
  amount: string
  valid_from: string
  valid_until?: string | null
  is_active: boolean
  type_id?: string | null
  type?: MeterTypeItem | null
  created_at: string
}

export interface Setting {
  id: string
  key: string
  value: string
  description?: string | null
}

export interface Consumption {
  id: string
  meter_id: string
  meter?: Meter
  month: number
  year: number
  current_reading: string
  previous_reading: string
  cubic_meters: string
  created_at: string
  payments?: Payment[]
}

export type PaymentStatus = "pending" | "paid" | "overdue" | "partial"
export type PaymentMethod = "cash" | "transfer" | "card" | "qr" | "other"

export interface PaymentHistory {
  id: string
  payment_id: string
  amount: string
  payment_method?: PaymentMethod | null
  reference?: string | null
  notes?: string | null
  created_at: string
}

export interface PaymentDiscount {
  id: string
  payment_id: string
  discount_id: string
  amount: string
  discount?: Discount
}

export interface Payment {
  id: string
  consumption_id: string
  consumption?: Consumption
  total_amount: string
  amount_paid: string
  status: PaymentStatus
  due_date: string
  paid_at?: string | null
  discount_amount: string
  created_at: string
  updated_at: string
  history?: PaymentHistory[]
  paymentDiscounts?: PaymentDiscount[]
}

export type NotificationType = "expiration" | "pending" | "overdue" | "payment"

export interface AppNotification {
  id: string
  member_id: string
  member?: Member
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface Dashboard {
  totalMembers: number
  totalMeters: number
  totalCollected: number
  totalBilled: number
  shareCollected: number
  collectionRate: number
  overdueCount: number
  pendingCount: number
  totalConsumption: number
  startDate: string
  endDate: string
}

export interface MonthlyRevenue {
  year: number
  month: number
  waterCollected: number
  shareCollected: number
  total: number
  billed: number
}

export interface UserWithRoles extends User {
  roles: Role[]
}

export type ZoneType = 'zone' | 'pipeline' | 'neighborhood' | 'other'

export interface ZoneTypeItem {
  id: string
  name: string
  default_color: string
  default_line_width: number
  created_at: string
  updated_at: string
}

export interface Zone {
  id: string
  name: string
  type: ZoneType
  geometry: Record<string, unknown>
  color?: string | null
  line_width?: number | null
  zone_type_id?: string | null
  zoneType?: ZoneTypeItem | null
  created_at: string
  updated_at: string
}

export type AuditAction = "create" | "update" | "delete"

export interface AuditLog {
  id: string
  user_id: string | null
  action: AuditAction
  entity: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: Pick<User, "id" | "email" | "full_name">
}

export type ActivityStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"

export interface ActivityType {
  id: string
  code: string
  name: string
  description?: string | null
  is_active: boolean
  created_at: string
}

export type ActivityEvidenceType = "photo" | "video" | "document"

export interface ActivityEvidence {
  id: string
  activity_id: string
  type: ActivityEvidenceType
  file_key: string
  file_name: string
  mime_type: string
  size?: string | null
  description?: string | null
  uploaded_by_user_id?: string | null
  uploadedBy?: User | null
  url?: string
  created_at: string
}

export interface ActivityAttendanceSession {
  id: string
  activity_id: string
  type: "initial" | "final"
  started_at: string | null
  ended_at: string | null
  started_by_user_id?: string | null
  ended_by_user_id?: string | null
}

export interface ActivitySummary {
  activity: Pick<Activity, "id" | "name" | "status" | "type_id" | "location">
  membersCount: number
  attendance: {
    present: number
    late: number
    leftEarly: number
    absent: number
    excused: number
    pending: number
    notRegistered: number
  }
  fines: {
    count: number
    pending: number
    paid: number
    cancelled: number
    totalAmount: string
    collectedAmount: string
  }
  finance: {
    income: string
    expense: string
    net: string
    movements: number
  }
}

export interface Activity {
  id: string
  name: string
  description?: string | null
  date: string
  start_time: string
  end_time: string
  status: ActivityStatus
  type_id?: string | null
  type?: ActivityType | null
  location?: string | null
  responsible_user_id?: string | null
  responsibleUser?: User | null
  collector_user_id?: string | null
  collectorUser?: User | null
  attendance_required: boolean
  fine_enabled: boolean
  initial_control_at: string | null
  final_control_at: string | null
  created_by: string
  creator?: User
  financial_responsible_user_id?: string | null
  financialResponsibleUser?: User | null
  created_at: string
  updated_at: string
  attendances?: Attendance[]
  fines?: Fine[]
  evidence?: ActivityEvidence[]
}

export type FineTypeAppliesTo =
  | "absent"
  | "late"
  | "left_early"
  | "any"
  | "manual"

export interface FineType {
  id: string
  code: string
  name: string
  description?: string | null
  amount: string
  applies_to: FineTypeAppliesTo
  is_active: boolean
  created_at: string
}

export type AttendanceStatus = "present" | "absent_start" | "absent_end" | "absent_both"

export type AttendanceResult =
  | "present"
  | "late"
  | "left_early"
  | "absent"
  | "excused"
  | "pending"

export interface Attendance {
  id: string
  activity_id: string
  member_id: string
  present_at_start: boolean
  checked_at_start: string | null
  present_at_end: boolean
  checked_at_end: string | null
  status: AttendanceStatus
  result: AttendanceResult | null
  initial_marked_at: string | null
  initial_marked_by_user_id?: string | null
  final_marked_at: string | null
  final_marked_by_user_id?: string | null
  created_at: string
  member?: Member
  activity?: Activity
}

export interface InitialControlResult {
  processed: number
  presentAtStart: number
  absentAtStart: number
  recordedAt: string
}

export interface FinalControlResult {
  processed: number
  presentAtEnd: number
  absentAtEnd: number
  excusedAtEnd: number
  finesGenerated: number
  finesReconciled: number
  recordedAt: string
}

export type FineStatus = "pending" | "paid" | "cancelled"

export type FineSource = "attendance" | "manual" | "other"

export interface Fine {
  id: string
  member_id: string
  activity_id: string
  fine_type_id: string
  amount: string
  status: FineStatus
  source: FineSource
  attendance_id?: string | null
  created_by_user_id?: string | null
  issued_at?: string | null
  paid_at: string | null
  notes?: string | null
  created_at: string
  member?: Member
  activity?: Activity
  fineType?: FineType
}

export interface FineStats {
  total: number
  pending: number
  paid: number
  cancelled: number
  totalAmount: string
  pendingAmount: string
}

export interface AttendanceSummary {
  total: number
  present: number
  absentStart: number
  absentEnd: number
  absentBoth: number
}

export type AssetStatus = "active" | "loaned" | "in_maintenance" | "lost" | "retired"

export type AssetCondition = "new" | "good" | "fair" | "poor"

export type AssetAcquisitionType = "purchase" | "donation" | "transfer" | "construction"

export type AssetMovementType = "loan" | "transfer" | "lost" | "retirement" | "restore"

export type AssetDocumentKind = "photo" | "invoice" | "delivery_receipt" | "other"

export interface AssetCategory {
  id: string
  name: string
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssetLocation {
  id: string
  name: string
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssetDocument {
  id: string
  asset_id: string
  file_key: string
  file_name: string
  mime_type: string
  file_size?: number | null
  kind: AssetDocumentKind
  uploaded_by?: string | null
  created_at: string
}

export interface AssetMovement {
  id: string
  asset_id: string
  type: AssetMovementType
  from_location_id?: string | null
  to_location_id?: string | null
  responsible_user_id?: string | null
  responsible_member_id?: string | null
  motive?: string | null
  moved_at: string
  returned_at?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  fromLocation?: AssetLocation | null
  toLocation?: AssetLocation | null
  responsibleUser?: Pick<User, "id" | "full_name"> | null
  responsibleMember?: Pick<Member, "id" | "first_name" | "last_name"> | null
}

export interface AssetMaintenance {
  id: string
  asset_id: string
  reason: string
  started_at: string
  finished_at?: string | null
  cost?: string | null
  provider?: string | null
  notes?: string | null
  created_by?: string | null
  expense_transaction_id?: string | null
  expenseTransaction?: FinanceTransaction | null
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  code: string
  name: string
  description?: string | null
  category_id?: string | null
  category?: AssetCategory | null
  location_id?: string | null
  location?: AssetLocation | null
  status: AssetStatus
  condition: AssetCondition
  quantity: number
  acquisition_date?: string | null
  acquisition_value?: string | null
  acquisition_type?: AssetAcquisitionType | null
  current_responsible_user_id?: string | null
  currentResponsibleUser?: Pick<User, "id" | "full_name"> | null
  current_responsible_member_id?: string | null
  currentResponsibleMember?: Pick<Member, "id" | "first_name" | "last_name"> | null
  notes?: string | null
  retired_at?: string | null
  retirement_reason?: string | null
  retirement_responsible_user_id?: string | null
  retirementResponsibleUser?: Pick<User, "id" | "full_name"> | null
  retirement_document_key?: string | null
  expense_transaction_id?: string | null
  created_at: string
  updated_at: string
  movements?: AssetMovement[]
  maintenances?: AssetMaintenance[]
  documents?: AssetDocument[]
}

export type FinanceTransactionType = "income" | "expense"
export type FinanceTransactionStatus = "active" | "voided"
export type FinanceSourceType =
  | "manual"
  | "water_bill_payment"
  | "water_membership_fee"
  | "fine_payment"
  | "asset_purchase"
  | "asset_maintenance"
  | "donation"
  | "court_rental"
  | "other"
export type FinanceDocumentKind = "invoice" | "receipt" | "transfer" | "photo" | "other"
export type FinanceCategoryType = "income" | "expense" | "both"

export interface FinanceCategory {
  id: string
  name: string
  type: FinanceCategoryType
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FinanceDocument {
  id: string
  transaction_id: string
  file_key: string
  file_name: string
  mime_type: string
  file_size?: number | null
  kind: FinanceDocumentKind
  uploaded_by?: string | null
  created_at: string
}

export interface FinanceTransaction {
  id: string
  type: FinanceTransactionType
  date: string
  amount: string
  concept: string
  category_id?: string | null
  category?: FinanceCategory | null
  payment_method?: PaymentMethod | null
  reference?: string | null
  member_id?: string | null
  member?: Pick<Member, "id" | "first_name" | "last_name"> | null
  source_type?: FinanceSourceType | null
  source_id?: string | null
  activity_id?: string | null
  status: FinanceTransactionStatus
  user_id?: string | null
  user?: Pick<User, "id" | "full_name"> | null
  responsible_user_id?: string | null
  responsibleUser?: Pick<User, "id" | "full_name"> | null
  collector_user_id?: string | null
  collectorUser?: Pick<User, "id" | "full_name"> | null
  registered_by_user_id?: string | null
  registeredByUser?: Pick<User, "id" | "full_name"> | null
  provider?: string | null
  asset_id?: string | null
  asset?: Asset | null
  notes?: string | null
  voided_at?: string | null
  voided_reason?: string | null
  voided_by?: string | null
  documents?: FinanceDocument[]
  created_at: string
  updated_at: string
}
