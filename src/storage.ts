import {
  computeTrip,
  CUSTOM_TPL_KEY,
  inputNumber,
  loadJSON,
  saveJSON,
  STATE_KEY,
  type CalcResult,
  type Item,
  type ProfitMode,
} from './calc'

// ---------- انواع ----------

export type TripStatus = 'quote' | 'confirmed' | 'completed'

export const STATUS_LABEL: Record<TripStatus, string> = {
  quote: 'اعلام قیمت',
  confirmed: 'تایید شده',
  completed: 'تکمیل شده',
}

export interface Customer {
  id: string
  name: string
  note: string
  createdAt: number
}

/** داده‌های ورودی یک تور — دقیقاً همان چیزی که محاسبه‌گر لازم دارد */
export interface TripData {
  tripTitle: string
  passengers: string
  exchangeRate: string
  profitPerPerson: string
  profitMode: ProfitMode
  roundUsd: number
  roundIqd: number
  repFee: string
  leaderFee: string
  iqdRate: string
  items: Item[]
  persian: boolean
}

export interface Trip {
  id: string
  customerId: string | null
  title: string
  status: TripStatus
  data: TripData
  /** خروجی محاسبات در لحظه ذخیره — برای نمایش سریع لیست */
  result: CalcResult
  createdAt: number
  updatedAt: number
}

// ---------- کلیدها ----------

export const CUSTOMERS_KEY = 'tc_customers_v1'
export const TRIPS_KEY = 'tc_trips_v1'
export const HOTELS_KEY = 'tc_hotels_v1'
export const RESERVATIONS_KEY = 'tc_reservations_v1'
export const VOUCHERS_KEY = 'tc_vouchers_v1'
export const AGENCY_KEY = 'tc_agency_v1'
export { CUSTOM_TPL_KEY, STATE_KEY }

// ---------- هتل‌ها و اسناد ----------

export interface Hotel {
  id: string
  name: string
  city: string
  phone: string
  email: string
  createdAt: number
}

/** درخواست رزرو — نامه سربرگ برای هتل */
export interface RoomLine {
  id: string
  roomType: string
  count: number
  services: string
}

export interface GuestLine {
  id: string
  name: string
  passport: string
  nationality: string
  roomId: string
}

export type DocStatus = 'draft' | 'sent' | 'approved' | 'rejected'

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'پیش‌نویس',
  sent: 'ارسال شده',
  approved: 'تایید هتل',
  rejected: 'رد شده',
}

export interface ReservationRequest {
  id: string
  hotelId: string
  title: string
  checkIn: string // YYYY-MM-DD
  checkOut: string // YYYY-MM-DD
  nights: number
  rooms: RoomLine[]
  guests: GuestLine[]
  notes: string
  contact: string // رابط/تورلیدر و تلفن
  status: DocStatus
  createdAt: number
  updatedAt: number
}

/** واچر — سند دست مسافر */
export interface Voucher {
  id: string
  hotelId: string
  code: string
  guestName: string
  adults: number
  children: number
  checkIn: string
  checkOut: string
  nights: number
  roomType: string
  services: string
  notes: string
  status: DocStatus
  createdAt: number
  updatedAt: number
}

/** مشخصات آژانس برای سربرگ نامه و واچر */
export interface AgencyProfile {
  name: string
  address: string
  phone: string
  email: string
  logoText: string
}

export const DEFAULT_AGENCY: AgencyProfile = {
  name: 'آژانس مسافرتی من',
  address: '',
  phone: '',
  email: '',
  logoText: '✈',
}

export function loadHotels(): Hotel[] {
  return loadJSON<Hotel[]>(HOTELS_KEY, [])
}

export function saveHotels(list: Hotel[]): void {
  saveJSON(HOTELS_KEY, list)
}

export function loadReservations(): ReservationRequest[] {
  return loadJSON<ReservationRequest[]>(RESERVATIONS_KEY, [])
}

export function saveReservations(list: ReservationRequest[]): void {
  saveJSON(RESERVATIONS_KEY, list)
}

export function loadVouchers(): Voucher[] {
  return loadJSON<Voucher[]>(VOUCHERS_KEY, [])
}

export function saveVouchers(list: Voucher[]): void {
  saveJSON(VOUCHERS_KEY, list)
}

export function loadAgency(): AgencyProfile {
  return { ...DEFAULT_AGENCY, ...loadJSON<Partial<AgencyProfile>>(AGENCY_KEY, {}) }
}

export function saveAgency(p: AgencyProfile): void {
  saveJSON(AGENCY_KEY, p)
}

/** تعداد شب بین دو تاریخ */
export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  const n = Math.round((b.getTime() - a.getTime()) / 86400000)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** تاریخ شمسی از رشته ISO (YYYY-MM-DD) */
export function faIso(iso: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso + 'T00:00:00'))
  } catch {
    return iso
  }
}

/** کد یکتای واچر مثل VC-7F3A2B */
export function voucherCode(): string {
  return 'VC-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

// ---------- ذخیره‌سازی امن localStorage ----------

export function loadCustomers(): Customer[] {
  return loadJSON<Customer[]>(CUSTOMERS_KEY, [])
}

export function saveCustomers(list: Customer[]): void {
  saveJSON(CUSTOMERS_KEY, list)
}

export function loadTrips(): Trip[] {
  return loadJSON<Trip[]>(TRIPS_KEY, [])
}

export function saveTrips(list: Trip[]): void {
  saveJSON(TRIPS_KEY, list)
}

// ---------- تبدیل داده‌ها ----------

/** داده‌های فرم محاسبه‌گر را به TripData تبدیل می‌کند */
export function toTripData(form: {
  tripTitle: string
  passengers: string
  exchangeRate: string
  profitPerPerson: string
  profitMode: ProfitMode
  roundUsd: number
  roundIqd: number
  repFee: string
  leaderFee: string
  iqdRate: string
  items: Item[]
  persian: boolean
}): TripData {
  return {
    tripTitle: form.tripTitle,
    passengers: form.passengers,
    exchangeRate: form.exchangeRate,
    profitPerPerson: form.profitPerPerson,
    profitMode: form.profitMode,
    roundUsd: form.roundUsd,
    roundIqd: form.roundIqd,
    repFee: form.repFee,
    leaderFee: form.leaderFee,
    iqdRate: form.iqdRate,
    items: form.items,
    persian: form.persian,
  }
}

/** از TripData نتیجه محاسبات را می‌سازد (بدون نیاز به React) */
export function computeFromData(d: TripData): CalcResult {
  return computeTrip({
    rows: d.items.map((it) => ({ price: inputNumber(it.price), mode: it.mode })),
    repFee: inputNumber(d.repFee),
    leaderFee: inputNumber(d.leaderFee),
    passengers: Math.max(1, Math.floor(inputNumber(d.passengers) || 1)),
    exchangeRate: Math.max(1, inputNumber(d.exchangeRate) || 1),
    iqdRate: Math.max(1, inputNumber(d.iqdRate) || 1),
    profit: inputNumber(d.profitPerPerson),
    profitMode: d.profitMode,
    roundUsd: d.roundUsd,
    roundIqd: d.roundIqd,
  })
}

// ---------- تاریخ شمسی ----------

export function faDateTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}

export function faDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleDateString()
  }
}
