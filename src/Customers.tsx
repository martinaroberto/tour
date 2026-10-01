import { useMemo, useState } from 'react'
import { formatNum } from './calc'
import { faDate, loadCustomers, loadTrips, saveCustomers, STATUS_LABEL } from './storage'
import type { Trip } from './storage'
import { uid } from './calc'

export default function Customers({ onNewTrip }: { onNewTrip: (customerId: string) => void }) {
  const [customers, setCustomers] = useState(() => loadCustomers())
  const [trips, setTrips] = useState<Trip[]>(() => loadTrips())
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const refresh = () => {
    setCustomers(loadCustomers())
    setTrips(loadTrips())
  }

  const addCustomer = () => {
    const n = name.trim()
    if (!n) return
    const next = [...loadCustomers(), { id: uid(), name: n, note: note.trim(), createdAt: Date.now() }]
    saveCustomers(next)
    setName('')
    setNote('')
    refresh()
  }

  const startEdit = (c: { id: string; name: string; note: string }) => {
    setEditId(c.id)
    setEditName(c.name)
    setEditNote(c.note)
  }

  const applyEdit = () => {
    if (!editId) return
    const n = editName.trim()
    if (!n) return
    saveCustomers(loadCustomers().map((c) => (c.id === editId ? { ...c, name: n, note: editNote.trim() } : c)))
    setEditId(null)
    refresh()
  }

  const deleteCustomer = (id: string) => {
    // تورهای این مشتری حذف نمی‌شوند؛ فقط به «بدون مشتری» منتقل می‌شوند
    saveCustomers(loadCustomers().filter((c) => c.id !== id))
    setConfirmDeleteId(null)
    refresh()
  }

  // آمار هر مشتری از روی تورها
  const statsByCustomer = useMemo(() => {
    const map = new Map<string, { total: number; quotes: number; confirmed: number; completed: number; revenueUsd: number }>()
    for (const t of trips) {
      if (!t.customerId) continue
      const s = map.get(t.customerId) ?? { total: 0, quotes: 0, confirmed: 0, completed: 0, revenueUsd: 0 }
      s.total += 1
      if (t.status === 'quote') s.quotes += 1
      if (t.status === 'confirmed') {
        s.confirmed += 1
        s.revenueUsd += t.result.finalPerPerson * Math.max(1, t.result.finalPerPerson ? 1 : 1)
      }
      if (t.status === 'completed') {
        s.completed += 1
        s.revenueUsd += t.result.finalPerPerson * 1
      }
      map.set(t.customerId, s)
    }
    return map
  }, [trips])

  const tripsOf = (cid: string) => trips.filter((t) => t.customerId === cid)

  const filtered = customers.filter((c) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (c.name + ' ' + c.note).toLowerCase().includes(q)
  })

  return (
    <div className="customers-page">
      <div className="card add-customer">
        <div className="field">
          <label>نام شرکت / شخص</label>
          <input
            type="text"
            value={name}
            placeholder="مثلاً: شرکت زیارت شرق"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomer()}
          />
        </div>
        <div className="field grow">
          <label>یادداشت (اختیاری)</label>
          <input type="text" value={note} placeholder="تلفن، آشنایی، ..." onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="load-btn" type="button" onClick={addCustomer}>
          + افزودن مشتری
        </button>
      </div>

      <div className="card filter-bar">
        <div className="field">
          <label>جستجوی مشتری</label>
          <input type="text" placeholder="نام یا یادداشت..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          {customers.length === 0
            ? 'هنوز مشتری‌ای ثبت نشده است. از فرم بالا اولین شرکت یا شخص را اضافه کنید.'
            : 'مشتری‌ای با این جستجو پیدا نشد.'}
        </div>
      ) : (
        filtered.map((c) => {
          const s = statsByCustomer.get(c.id) ?? { total: 0, quotes: 0, confirmed: 0, completed: 0, revenueUsd: 0 }
          const ct = tripsOf(c.id)
          const open = expandedId === c.id
          return (
            <div className="card customer-card" key={c.id}>
              <div className="customer-head">
                <button
                  type="button"
                  className="expand-btn"
                  title={open ? 'بستن' : 'مشاهده تورهای این مشتری'}
                  onClick={() => setExpandedId(open ? null : c.id)}
                >
                  {open ? '▾' : '▸'}
                </button>
                <div className="customer-info">
                  <div className="customer-name">{c.name}</div>
                  {c.note && <div className="customer-note">{c.note}</div>}
                  <div className="customer-since">عضو از: {faDate(c.createdAt)}</div>
                </div>
                <div className="customer-stats">
                  <div className="mini-stat">
                    <b>{formatNum(s.total, true)}</b>
                    <span>تور</span>
                  </div>
                  <div className="mini-stat yellow">
                    <b>{formatNum(s.quotes, true)}</b>
                    <span>اعلام قیمت</span>
                  </div>
                  <div className="mini-stat blue">
                    <b>{formatNum(s.confirmed, true)}</b>
                    <span>تایید</span>
                  </div>
                  <div className="mini-stat green">
                    <b>{formatNum(s.completed, true)}</b>
                    <span>تکمیل</span>
                  </div>
                  <div className="mini-stat usd">
                    <b>${formatNum(Math.round(s.revenueUsd), true)}</b>
                    <span>فروش</span>
                  </div>
                </div>
                <div className="customer-actions">
                  <button className="sm-btn" type="button" onClick={() => onNewTrip(c.id)} title="تور جدید برای این مشتری">
                    + تور جدید
                  </button>
                  {editId === c.id ? (
                    <>
                      <button className="sm-btn" type="button" onClick={applyEdit}>
                        ✓ ذخیره
                      </button>
                      <button className="sm-btn ghost" type="button" onClick={() => setEditId(null)}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <button className="sm-btn" type="button" onClick={() => startEdit(c)}>
                      ✏️ ویرایش
                    </button>
                  )}
                  {confirmDeleteId === c.id ? (
                    <>
                      <button className="sm-btn danger" type="button" onClick={() => deleteCustomer(c.id)}>
                        ✓ مطمئنم
                      </button>
                      <button className="sm-btn ghost" type="button" onClick={() => setConfirmDeleteId(null)}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <button className="sm-btn danger" type="button" onClick={() => setConfirmDeleteId(c.id)}>
                      🗑 حذف
                    </button>
                  )}
                </div>
              </div>

              {editId === c.id && (
                <div className="customer-edit">
                  <div className="field">
                    <label>نام</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="field grow">
                    <label>یادداشت</label>
                    <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                  </div>
                </div>
              )}

              {open && (
                <div className="customer-trips">
                  {ct.length === 0 ? (
                    <div className="empty-inline">برای این مشتری هنوز توری ثبت نشده است.</div>
                  ) : (
                    <table className="ct-table">
                      <thead>
                        <tr>
                          <th>عنوان تور</th>
                          <th>وضعیت</th>
                          <th>نفرات</th>
                          <th>فروش هر نفر (دلار)</th>
                          <th>تاریخ ایجاد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ct.map((t) => (
                          <tr key={t.id}>
                            <td className="rt">{t.title}</td>
                            <td>
                              <span
                                className={`status-badge ${
                                  t.status === 'quote' ? 'st-quote' : t.status === 'confirmed' ? 'st-confirmed' : 'st-completed'
                                }`}
                              >
                                {STATUS_LABEL[t.status]}
                              </span>
                            </td>
                            <td>{formatNum(Math.round(Number(t.data.passengers.replace(/[^\d]/g, '')) || 1), t.data.persian)}</td>
                            <td>${formatNum(t.result.finalPerPerson, t.data.persian, 2)}</td>
                            <td>{faDate(t.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
