import { useMemo, useState } from 'react'
import Invoice, { type InvoiceData } from './Invoice'
import { formatNum, inputNumber } from './calc'
import {
  faDateTime,
  loadCustomers,
  loadTrips,
  saveTrips,
  STATUS_LABEL,
  type Customer,
  type Trip,
  type TripStatus,
} from './storage'

const faDate = () => {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date())
  } catch {
    return new Date().toLocaleDateString()
  }
}

export default function Trips({ onEdit }: { onEdit: (trip: Trip) => void }) {
  const [trips, setTrips] = useState<Trip[]>(() => loadTrips())
  const [customers] = useState<Customer[]>(() => loadCustomers())
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return trips.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (customerFilter === 'none' && t.customerId) return false
      if (customerFilter !== 'all' && customerFilter !== 'none' && t.customerId !== customerFilter) return false
      if (!q) return true
      const hay = `${t.title} ${customerName(t.customerId) ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [trips, query, statusFilter, customerFilter, customers])

  // آمار کلی
  const stats = useMemo(() => {
    let confirmed = 0
    let completed = 0
    let quotes = 0
    let revenue = 0 // فروش کل گروه تاییدشده‌ها + تکمیل‌شده‌ها (دلار)
    for (const t of trips) {
      const pax = Math.max(1, Math.floor(inputNumber(t.data.passengers) || 1))
      if (t.status === 'quote') quotes += 1
      if (t.status === 'confirmed') {
        confirmed += 1
        revenue += t.result.finalPerPerson * pax
      }
      if (t.status === 'completed') {
        completed += 1
        revenue += t.result.finalPerPerson * pax
      }
    }
    return { quotes, confirmed, completed, revenue, total: trips.length }
  }, [trips])

  const statusClass = (s: TripStatus) => (s === 'quote' ? 'st-quote' : s === 'confirmed' ? 'st-confirmed' : 'st-completed')

  const changeStatus = (id: string, s: TripStatus) => {
    setTrips((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, status: s, updatedAt: Date.now() } : t))
      saveTrips(next)
      return next
    })
  }

  const deleteTrip = (id: string) => {
    setTrips((prev) => {
      const next = prev.filter((t) => t.id !== id)
      saveTrips(next)
      return next
    })
    setConfirmDeleteId(null)
  }

  const openInvoice = (t: Trip) => {
    const pax = Math.max(1, Math.floor(inputNumber(t.data.passengers) || 1))
    const rows = t.data.items.map((it) => {
      const price = inputNumber(it.price)
      const rowTotal = it.mode === 'tot' ? price : price * pax
      return { desc: it.desc, price, mode: it.mode, rowTotal }
    })
    setInvoice({
      tripTitle: t.title,
      date: faDate(),
      passengers: pax,
      rows,
      repFee: inputNumber(t.data.repFee),
      leaderFee: inputNumber(t.data.leaderFee),
      totalToman: t.result.totalToman,
      perPersonToman: t.result.perPersonToman,
      perPersonUsd: t.result.perPersonUsd,
      profitUsd: t.result.profitUsd,
      finalPerPerson: t.result.finalPerPerson,
      finalPerPersonIqd: t.result.finalPerPersonIqd,
      persian: t.data.persian,
    })
  }

  return (
    <div className="trips-page">
      {/* ---- آمار کلی ---- */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-num">{formatNum(stats.total, true)}</div>
          <div className="stat-label">کل تورها</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-num">{formatNum(stats.quotes, true)}</div>
          <div className="stat-label">اعلام قیمت</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-num">{formatNum(stats.confirmed, true)}</div>
          <div className="stat-label">تایید شده</div>
        </div>
        <div className="stat-card green">
          <div className="stat-num">{formatNum(stats.completed, true)}</div>
          <div className="stat-label">تکمیل شده</div>
        </div>
        <div className="stat-card usd">
          <div className="stat-num">${formatNum(Math.round(stats.revenue), true)}</div>
          <div className="stat-label">فروش تاییدشده‌ها (دلار)</div>
        </div>
      </div>

      {/* ---- فیلترها ---- */}
      <div className="card filter-bar">
        <div className="field">
          <label>جستجو</label>
          <input
            type="text"
            placeholder="عنوان تور یا نام مشتری..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label>وضعیت</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TripStatus | 'all')}>
            <option value="all">همه</option>
            <option value="quote">اعلام قیمت</option>
            <option value="confirmed">تایید شده</option>
            <option value="completed">تکمیل شده</option>
          </select>
        </div>
        <div className="field">
          <label>مشتری</label>
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
            <option value="all">همه مشتری‌ها</option>
            <option value="none">بدون مشتری</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---- لیست تورها ---- */}
      {filtered.length === 0 ? (
        <div className="card empty-state">
          {trips.length === 0
            ? 'هنوز توری ذخیره نشده است. از تب «محاسبه‌گر» اولین تور را بسازید و ذخیره کنید.'
            : 'هیچ توری با این فیلترها پیدا نشد.'}
        </div>
      ) : (
        filtered.map((t) => (
          <div className="card trip-row" key={t.id}>
            <div className="trip-main">
              <div className="trip-title-line">
                <span className="trip-title">{t.title}</span>
                <span className={`status-badge ${statusClass(t.status)}`}>{STATUS_LABEL[t.status]}</span>
              </div>
              <div className="trip-meta">
                <span>👤 {customerName(t.customerId) ?? 'بدون مشتری'}</span>
                <span>👥 {formatNum(Math.floor(inputNumber(t.data.passengers) || 1), t.data.persian)} نفر</span>
                <span>🕒 ایجاد: {faDateTime(t.createdAt)}</span>
                {t.updatedAt !== t.createdAt && <span>✏️ ویرایش: {faDateTime(t.updatedAt)}</span>}
              </div>
            </div>
            <div className="trip-numbers">
              <div>
                <small>فروش هر نفر</small>
                <b>${formatNum(t.result.finalPerPerson, t.data.persian, 2)}</b>
              </div>
              <div>
                <small>دینار / نفر</small>
                <b>{formatNum(t.result.finalPerPersonIqd, t.data.persian, 0)} IQD</b>
              </div>
              <div>
                <small>جمع کل (تومان)</small>
                <b>{formatNum(t.result.totalToman, t.data.persian, 0)}</b>
              </div>
            </div>
            <div className="trip-actions">
              <select
                className="status-select"
                value={t.status}
                onChange={(e) => changeStatus(t.id, e.target.value as TripStatus)}
                title="تغییر وضعیت"
              >
                <option value="quote">اعلام قیمت</option>
                <option value="confirmed">تایید شده</option>
                <option value="completed">تکمیل شده</option>
              </select>
              <button className="sm-btn" type="button" onClick={() => openInvoice(t)} title="پیش‌فاکتور">
                🧾 پیش‌فاکتور
              </button>
              <button className="sm-btn" type="button" onClick={() => onEdit(t)} title="ویرایش تور">
                ✏️ ویرایش
              </button>
              {confirmDeleteId === t.id ? (
                <>
                  <button className="sm-btn danger" type="button" onClick={() => deleteTrip(t.id)}>
                    ✓ مطمئنم
                  </button>
                  <button className="sm-btn ghost" type="button" onClick={() => setConfirmDeleteId(null)}>
                    ✕
                  </button>
                </>
              ) : (
                <button className="sm-btn danger" type="button" onClick={() => setConfirmDeleteId(t.id)} title="حذف تور">
                  🗑 حذف
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {invoice && <Invoice data={invoice} open onClose={() => setInvoice(null)} />}
    </div>
  )
}
