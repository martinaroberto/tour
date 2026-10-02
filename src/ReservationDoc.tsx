import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatNum, uid } from './calc'
import {
  faIso,
  nightsBetween,
  type AgencyProfile,
  type GuestLine,
  type Hotel,
  type ReservationRequest,
  type RoomLine,
} from './storage'

/** مودال ساخت/ویرایش درخواست رزرو + نمای نامه سربرگ */
export default function ReservationDoc({
  hotel,
  agency,
  initial,
  onClose,
  onSave,
}: {
  hotel: Hotel
  agency: AgencyProfile
  initial: ReservationRequest | null
  onClose: () => void
  onSave: (r: ReservationRequest) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? `درخواست رزرو ${hotel.name}`)
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? '')
  const [rooms, setRooms] = useState<RoomLine[]>(
    initial?.rooms?.length ? initial.rooms : [{ id: uid(), roomType: 'اتاق دوتخته', count: 1, services: '' }],
  )
  const [guests, setGuests] = useState<GuestLine[]>(
    initial?.guests?.length ? initial.guests : [{ id: uid(), name: '', passport: '', nationality: 'عراقی', roomId: '' }],
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [contact, setContact] = useState(initial?.contact ?? '')

  const nights = nightsBetween(checkIn, checkOut)

  const letterNo = useMemo(() => {
    const d = new Date()
    return `R-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`
  }, [])

  // در حالت چاپ فقط همین سند دیده شود
  useEffect(() => {
    document.body.classList.add('doc-modal-open')
    return () => document.body.classList.remove('doc-modal-open')
  }, [])

  const updateRoom = (id: string, patch: Partial<RoomLine>) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const updateGuest = (id: string, patch: Partial<GuestLine>) =>
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))

  const build = (): ReservationRequest => ({
    id: initial?.id ?? uid(),
    hotelId: hotel.id,
    title: title.trim() || `درخواست رزرو ${hotel.name}`,
    checkIn,
    checkOut,
    nights,
    rooms: rooms.filter((r) => r.roomType.trim() || r.count > 0),
    guests: guests.filter((g) => g.name.trim()),
    notes: notes.trim(),
    contact: contact.trim(),
    status: initial?.status ?? 'draft',
    createdAt: initial?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  })

  const saveAndClose = () => {
    onSave(build())
    onClose()
  }

  const printDoc = () => {
    window.print()
  }

  const f = (n: number) => formatNum(n, true)

  return createPortal(
    <div className="doc-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={(e) => e.stopPropagation()}>
        {/* ---------- فرم ---------- */}
        <div className="doc-form no-print">
          <h2>{initial ? 'ویرایش درخواست رزرو' : 'درخواست رزرو جدید'}</h2>
          <div className="doc-form-grid">
            <div className="field">
              <label>موضوع نامه</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>رابط / تورلیدر و تلفن</label>
              <input type="text" value={contact} placeholder="مثلاً: احمد – 0770..." onChange={(e) => setContact(e.target.value)} />
            </div>
            <div className="field">
              <label>تاریخ ورود</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="field">
              <label>تاریخ خروج</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <p className="hint">{nights > 0 ? `${f(nights)} شب اقامت` : 'تاریخ ورود و خروج را انتخاب کنید.'}</p>

          <h3>اتاق‌ها و خدمات</h3>
          {rooms.map((r) => (
            <div className="line-row" key={r.id}>
              <input
                type="text"
                placeholder="نوع اتاق"
                value={r.roomType}
                onChange={(e) => updateRoom(r.id, { roomType: e.target.value })}
              />
              <input
                type="number"
                min={1}
                style={{ maxWidth: 90 }}
                value={r.count}
                onChange={(e) => updateRoom(r.id, { count: Math.max(1, Number(e.target.value) || 1) })}
              />
              <input
                type="text"
                className="grow"
                placeholder="خدمات (صبحانه، نیم‌پنسیون، ترانسفر ...)"
                value={r.services}
                onChange={(e) => updateRoom(r.id, { services: e.target.value })}
              />
              <button type="button" className="rm-btn" onClick={() => setRooms((p) => p.filter((x) => x.id !== r.id))}>
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="sm-btn"
            onClick={() => setRooms((p) => [...p, { id: uid(), roomType: '', count: 1, services: '' }])}
          >
            + افزودن ردیف اتاق
          </button>

          <h3>مسافران</h3>
          {guests.map((g) => (
            <div className="line-row" key={g.id}>
              <input type="text" placeholder="نام مسافر" value={g.name} onChange={(e) => updateGuest(g.id, { name: e.target.value })} />
              <input
                type="text"
                placeholder="شماره پاسپورت"
                value={g.passport}
                onChange={(e) => updateGuest(g.id, { passport: e.target.value })}
              />
              <input
                type="text"
                placeholder="ملیت"
                value={g.nationality}
                onChange={(e) => updateGuest(g.id, { nationality: e.target.value })}
              />
              <select value={g.roomId} onChange={(e) => updateGuest(g.id, { roomId: e.target.value })}>
                <option value="">بدون اتاق مشخص</option>
                {rooms.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    اتاق {i + 1}: {r.roomType || '—'}
                  </option>
                ))}
              </select>
              <button type="button" className="rm-btn" onClick={() => setGuests((p) => p.filter((x) => x.id !== g.id))}>
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="sm-btn"
            onClick={() => setGuests((p) => [...p, { id: uid(), name: '', passport: '', nationality: 'عراقی', roomId: '' }])}
          >
            + افزودن مسافر
          </button>

          <div className="field" style={{ marginTop: 12 }}>
            <label>توضیحات برای هتل</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        {/* ---------- پیش‌نمایش نامه سربرگ ---------- */}
        <div className="letter" id="reservation-letter">
          <div className="letter-head">
            <div className="letter-brand">
              <span className="letter-logo">{agency.logoText || '✈'}</span>
              <div>
                <div className="letter-agency">{agency.name}</div>
                {agency.address && <div className="letter-line">{agency.address}</div>}
                {(agency.phone || agency.email) && (
                  <div className="letter-line">
                    {agency.phone && <span>تلفن: {agency.phone}</span>}
                    {agency.phone && agency.email && <span> | </span>}
                    {agency.email && <span dir="ltr">{agency.email}</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="letter-meta" dir="ltr">
              <div>No: {letterNo}</div>
              <div>Date: {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date())}</div>
            </div>
          </div>

          <div className="letter-to">
            <b>جناب مدیریت محترم هتل {hotel.name}</b>
            {hotel.city && <div>{hotel.city}</div>}
            {hotel.email && <div dir="ltr">{hotel.email}</div>}
          </div>

          <div className="letter-subject">موضوع: {title}</div>

          <p className="letter-body">
            با سلام و احترام؛
            <br />
            خواهشمند است رزرو موارد زیر را برای مسافران این آژانس انجام فرمایید:
          </p>

          <table className="letter-table">
            <thead>
              <tr>
                <th>#</th>
                <th>نوع اتاق</th>
                <th>تعداد</th>
                <th>خدمات</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={r.id}>
                  <td>{f(i + 1)}</td>
                  <td className="rt">{r.roomType || '—'}</td>
                  <td>{f(r.count)}</td>
                  <td className="rt">{r.services || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {guests.some((g) => g.name.trim()) && (
            <table className="letter-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>نام مسافر</th>
                  <th>پاسپورت</th>
                  <th>ملیت</th>
                </tr>
              </thead>
              <tbody>
                {guests
                  .filter((g) => g.name.trim())
                  .map((g, i) => (
                    <tr key={g.id}>
                      <td>{f(i + 1)}</td>
                      <td className="rt">{g.name}</td>
                      <td dir="ltr">{g.passport || '—'}</td>
                      <td>{g.nationality || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          <div className="letter-info">
            <div>📅 تاریخ ورود: {faIso(checkIn)}</div>
            <div>📅 تاریخ خروج: {faIso(checkOut)}</div>
            <div>🌙 مدت اقامت: {f(nights)} شب</div>
          </div>

          {notes && <p className="letter-body">توضیحات: {notes}</p>}
          {contact && <p className="letter-body">هماهنگی: {contact}</p>}

          <div className="letter-sign">
            <div>با تشکر</div>
            <div className="letter-agency">{agency.name}</div>
          </div>
        </div>

        {/* ---------- دکمه‌ها ---------- */}
        <div className="doc-actions no-print">
          <button className="load-btn" type="button" onClick={saveAndClose}>
            💾 ذخیره درخواست
          </button>
          <button className="load-btn ghost-btn" type="button" onClick={printDoc}>
            🖨 چاپ / PDF
          </button>
          <button className="sm-btn ghost" type="button" onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
