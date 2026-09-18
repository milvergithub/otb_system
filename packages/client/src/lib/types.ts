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
export type PaymentMethod = "cash" | "transfer" | "card"

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
  month: number
  year: number
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

export interface ActivityShare {
  id: string
  activity_id: string
  user_id: string
  user: User
  permission: string
  created_at: string
}

export interface Activity {
  id: string
  name: string
  description?: string | null
  date: string
  start_time: string
  end_time: string
  initial_control_at: string | null
  final_control_at: string | null
  created_by: string
  creator?: User
  created_at: string
  updated_at: string
  attendances?: Attendance[]
  fines?: Fine[]
  shares?: ActivityShare[]
}

export type FineTypeCode = "absent_start" | "absent_both" | "absent_end"

export interface FineType {
  id: string
  code: FineTypeCode
  name: string
  description?: string | null
  amount: string
  is_active: boolean
  created_at: string
}

export type AttendanceStatus = "present" | "absent_start" | "absent_end" | "absent_both"

export interface Attendance {
  id: string
  activity_id: string
  member_id: string
  present_at_start: boolean
  checked_at_start: string | null
  present_at_end: boolean
  checked_at_end: string | null
  status: AttendanceStatus
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
  finesGenerated: number
  finesReconciled: number
  recordedAt: string
}

export type FineStatus = "pending" | "paid" | "cancelled"

export interface Fine {
  id: string
  member_id: string
  activity_id: string
  fine_type_id: string
  amount: string
  status: FineStatus
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
