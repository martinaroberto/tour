import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatNum, uid } from './calc'
import { faIso, nightsBetween, voucherCode, type AgencyProfile, type Hotel, type Voucher } from './storage'

/** مودال ساخت/ویرایش واچر مسافر */
export default function VoucherDoc({
  hotel,
  agency,
  initial,
  onClose,
  onSave,
}: {
  hotel: Hotel
  agency: AgencyProfile
  initial: Voucher | null
  onClose: () => void
  onSave: (v: Voucher) => void
}) {
  const [guestName, setGuestName] = useState(initial?.guestName ?? '')
  const [adults, setAdults] = useState(initial?.adults ?? 2)
  const [children, setChildren] = useState(initial?.children ?? 0)
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? '')
  const [roomType, setRoomType] = useState(initial?.roomType ?? 'اتاق دوتخته')
  const [services, setServices] = useState(initial?.services ?? 'صبحانه')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const code = useMemo(() => initial?.code ?? voucherCode(), [initial])
  const nights = nightsBetween(checkIn, checkOut)

  useEffect(() => {
    document.body.classList.add('doc-modal-open')
    return () => document.body.classList.remove('doc-modal-open')
  }, [])

  const f = (n: number) => formatNum(n, true)

  const build = (): Voucher => ({
    id: initial?.id ?? uid(),
    hotelId: hotel.id,
    code,
    guestName: guestName.trim(),
    adults: Math.max(1, adults),
    children: Math.max(0, children),
    checkIn,
    checkOut,
    nights,
    roomType: roomType.trim(),
    services: services.trim(),
    notes: notes.trim(),
    status: initial?.status ?? 'draft',
    createdAt: initial?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  })

  return createPortal(
    <div className="doc-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={(e) => e.stopPropagation()}>
        {/* ---------- فرم ---------- */}
        <div className="doc-form no-print">
          <h2>{initial ? 'ویرایش واچر' : 'واچر جدید'} — {hotel.name}</h2>
          <div className="doc-form-grid">
            <div className="field">
              <label>نام سرپرست مسافران</label>
              <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="نام و نام خانوادگی" />
            </div>
            <div className="field">
              <label>تعداد بزرگسال</label>
              <input type="number" min={1} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div className="field">
              <label>تعداد کودک</label>
              <input type="number" min={0} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
          <div className="doc-form-grid">
            <div className="field">
              <label>تاریخ ورود</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="field">
              <label>تاریخ خروج</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="field">
              <label>نوع اتاق</label>
              <input type="text" value={roomType} onChange={(e) => setRoomType(e.target.value)} />
            </div>
            <div className="field">
              <label>خدمات</label>
              <input type="text" value={services} onChange={(e) => setServices(e.target.value)} placeholder="صبحانه، ترانسفر و ..." />
            </div>
          </div>
          <div className="field">
            <label>توضیحات روی واچر</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="مثلاً: کد رزرو هتل، ساعت تحویل اتاق و ..." />
          </div>
        </div>

        {/* ---------- پیش‌نمایش واچر ---------- */}
        <div className="voucher" id="voucher-doc">
          <div className="voucher-top">
            <div className="voucher-brand">
              <span className="letter-logo">{agency.logoText || '✈'}</span>
              <div>
                <div className="letter-agency">{agency.name}</div>
                {agency.phone && <div className="letter-line">تلفن: {agency.phone}</div>}
              </div>
            </div>
            <div className="voucher-code" dir="ltr">{code}</div>
          </div>

          <div className="voucher-title">واچر اقامت هتل — HOTEL VOUCHER</div>

          <div className="voucher-hotel">
            <div className="vh-name">🏨 {hotel.name}</div>
            {hotel.city && <div className="vh-line">{hotel.city}</div>}
            {hotel.phone && <div className="vh-line" dir="ltr">☎ {hotel.phone}</div>}
          </div>

          <div className="voucher-grid">
            <div className="v-cell">
              <small>مسافر (سرپرست)</small>
              <b>{guestName || '—'}</b>
            </div>
            <div className="v-cell">
              <small>همراهان</small>
              <b>
                {f(adults)} بزرگسال{children > 0 ? ` + ${f(children)} کودک` : ''}
              </b>
            </div>
            <div className="v-cell">
              <small>ورود</small>
              <b>{faIso(checkIn)}</b>
            </div>
            <div className="v-cell">
              <small>خروج</small>
              <b>{faIso(checkOut)}</b>
            </div>
            <div className="v-cell">
              <small>مدت اقامت</small>
              <b>{f(nights)} شب</b>
            </div>
            <div className="v-cell">
              <small>نوع اتاق</small>
              <b>{roomType || '—'}</b>
            </div>
            <div className="v-cell wide">
              <small>خدمات</small>
              <b>{services || '—'}</b>
            </div>
            {notes && (
              <div className="v-cell wide">
                <small>توضیحات</small>
                <b>{notes}</b>
              </div>
            )}
          </div>

          <div className="voucher-foot">
            <div className="vf-note">
              این واچر فقط برای مسافر نام‌برده معتبر است. لطفاً هنگام ورود به همراه پاسپورت ارائه شود.
            </div>
            <div className="vf-sign">
              <div>مهر و امضای آژانس</div>
              <div className="vf-line"></div>
            </div>
          </div>
        </div>

        {/* ---------- دکمه‌ها ---------- */}
        <div className="doc-actions no-print">
          <button
            className="load-btn"
            type="button"
            onClick={() => {
              onSave(build())
              onClose()
            }}
          >
            💾 ذخیره واچر
          </button>
          <button className="load-btn ghost-btn" type="button" onClick={() => window.print()}>
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
