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
export { CUSTOM_TPL_KEY, STATE_KEY }

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
