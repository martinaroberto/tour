export type Mode = 'pp' | 'tot'
export type ProfitMode = 'usd' | 'percent'

export interface Item {
  id: string
  desc: string
  price: string
  mode: Mode
}

export interface Template {
  name: string
  rows: [string, Mode][]
}

export interface CustomTemplate {
  name: string
  rows: { desc: string; price: string; mode: Mode }[]
}

// نوع 'pp'  = قیمت سرانه (در تعداد نفرات ضرب می‌شه)   → مثل پرواز، هتل
// نوع 'tot' = هزینه کل گروه (بر تعداد نفرات تقسیم می‌شه) → مثل نماینده آژانس، تورلیدر، گشت، ماشین فرودگاه
export const TEMPLATES: Template[] = [
  {
    name: 'قم و مشهد هوایی',
    rows: [
      ['پرواز بغداد به مشهد', 'pp'],
      ['گشت مشهد', 'tot'],
      ['هتل مشهد', 'pp'],
      ['پرواز مشهد به قم', 'pp'],
      ['هتل قم', 'pp'],
      ['گشت قم', 'tot'],
      ['ماشین قم به فرودگاه امام', 'tot'],
      ['پرواز تهران به بغداد', 'pp'],
    ],
  },
  {
    name: 'قم و مشهد اتوبوسی',
    rows: [
      ['اتوبوس مرز به مشهد', 'pp'],
      ['گشت مشهد', 'tot'],
      ['هتل مشهد', 'pp'],
      ['اتوبوس مشهد به قم', 'pp'],
      ['هتل قم', 'pp'],
      ['گشت قم', 'tot'],
      ['اتوبوس قم به مرز', 'pp'],
    ],
  },
  {
    name: 'مشهد و قم و شمال هوایی',
    rows: [
      ['پرواز بغداد به مشهد', 'pp'],
      ['گشت مشهد', 'tot'],
      ['هتل مشهد', 'pp'],
      ['پرواز مشهد به رامسر', 'pp'],
      ['هتل رامسر', 'pp'],
      ['گشت شمال', 'tot'],
      ['رامسر به قم', 'pp'],
      ['هتل قم', 'pp'],
      ['گشت قم', 'tot'],
      ['ماشین قم به فرودگاه امام', 'tot'],
      ['پرواز تهران به بغداد', 'pp'],
    ],
  },
  {
    name: 'مشهد و قم و شمال اتوبوسی',
    rows: [
      ['اتوبوس مرز به مشهد', 'pp'],
      ['گشت مشهد', 'tot'],
      ['هتل مشهد', 'pp'],
      ['اتوبوس مشهد به رامسر', 'pp'],
      ['هتل رامسر', 'pp'],
      ['گشت شمال', 'tot'],
      ['اتوبوس رامسر به قم', 'pp'],
      ['هتل قم', 'pp'],
      ['گشت قم', 'tot'],
      ['اتوبوس قم به مرز', 'pp'],
    ],
  },
  {
    name: 'مشهد و شمال هوایی',
    rows: [
      ['پرواز بغداد به مشهد', 'pp'],
      ['گشت مشهد', 'tot'],
      ['هتل مشهد', 'pp'],
      ['پرواز مشهد به رامسر', 'pp'],
      ['هتل رامسر', 'pp'],
      ['گشت شمال', 'tot'],
      ['پرواز رامسر به بغداد', 'pp'],
    ],
  },
]

// ---- ارقام فارسی/عربی → انگلیسی (باگ ورودی کیبورد فارسی) ----
const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'

export function normalizeDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
}

function toPersianDigits(s: string): string {
  return s.replace(/\d/g, (d) => FA[+d])
}

export function rawNumber(s: string): number {
  const n = Number(normalizeDigits(String(s ?? '')).replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function formatNum(n: number, persian: boolean, maxFrac = 0): string {
  const s = n.toLocaleString('en-US', { maximumFractionDigits: maxFrac })
  return persian ? toPersianDigits(s) : s
}

export function roundUpTo(n: number, step: number): number {
  return step > 0 ? Math.ceil(n / step - 1e-9) * step : n
}

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---- محاسبه اصلی تور — برای هر تعداد نفر قابل استفاده (جدول مقایسه هم از همین استفاده می‌کنه) ----
export interface CalcInput {
  rows: { price: number; mode: Mode }[]
  repFee: number
  leaderFee: number
  passengers: number
  exchangeRate: number
  iqdRate: number
  profit: number
  profitMode: ProfitMode
  roundUsd: number
  roundIqd: number
}

export interface CalcResult {
  totalToman: number
  perPersonToman: number
  perPersonUsd: number
  profitUsd: number
  totalUsd: number
  finalPerPerson: number
  finalPerPersonIqd: number
}

export function computeTrip(i: CalcInput): CalcResult {
  const pax = Math.max(1, Math.floor(i.passengers))
  const rate = Math.max(1, i.exchangeRate)
  const itemsTotal = i.rows.reduce((acc, r) => acc + (r.mode === 'tot' ? r.price : r.price * pax), 0)
  const totalToman = itemsTotal + i.repFee + i.leaderFee
  const perPersonToman = totalToman / pax
  const perPersonUsd = perPersonToman / rate
  // سود دلاری ثابت یا درصدی روی هزینه هر نفر
  const profitUsd = i.profitMode === 'usd' ? i.profit : perPersonUsd * (i.profit / 100)
  const totalUsd = perPersonUsd * pax
  const finalPerPerson = roundUpTo(perPersonUsd + profitUsd, i.roundUsd)
  const finalPerPersonIqd = roundUpTo(finalPerPerson * i.iqdRate, i.roundIqd)
  return { totalToman, perPersonToman, perPersonUsd, profitUsd, totalUsd, finalPerPerson, finalPerPersonIqd }
}

// ---- localStorage امن ----
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* حافظه پر یا غیرفعال — بی‌صدا رد شو */
  }
}

export const STATE_KEY = 'tc_state_v1'
export const CUSTOM_TPL_KEY = 'tc_custom_templates_v1'
