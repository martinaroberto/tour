import { useMemo, useState } from 'react'
import { faDateTime, faIso } from './storage'
import {
  DOC_STATUS_LABEL,
  loadAgency,
  loadHotels,
  loadReservations,
  loadVouchers,
  saveAgency,
  saveHotels,
  saveReservations,
  saveVouchers,
  type AgencyProfile,
  type DocStatus,
  type Hotel,
  type ReservationRequest,
  type Voucher,
} from './storage'
import { uid } from './calc'
import ReservationDoc from './ReservationDoc'
import VoucherDoc from './VoucherDoc'

type DocTab = 'reservations' | 'vouchers'

export default function Hotels() {
  const [hotels, setHotels] = useState<Hotel[]>(() => loadHotels())
  const [reservations, setReservations] = useState<ReservationRequest[]>(() => loadReservations())
  const [vouchers, setVouchers] = useState<Voucher[]>(() => loadVouchers())
  const [agency, setAgency] = useState<AgencyProfile>(() => loadAgency())
  const [agencyOpen, setAgencyOpen] = useState(false)
  const [newHotelName, setNewHotelName] = useState('')
  const [newHotelCity, setNewHotelCity] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [docTab, setDocTab] = useState<DocTab>('reservations')
  const [resDocFor, setResDocFor] = useState<{ hotel: Hotel; initial: ReservationRequest | null } | null>(null)
  const [voucherDocFor, setVoucherDocFor] = useState<{ hotel: Hotel; initial: Voucher | null } | null>(null)
  const [confirmHotelDelete, setConfirmHotelDelete] = useState<string | null>(null)

  const refresh = () => {
    setHotels(loadHotels())
    setReservations(loadReservations())
    setVouchers(loadVouchers())
  }

  const addHotel = () => {
    const name = newHotelName.trim()
    if (!name) return
    saveHotels([...loadHotels(), { id: uid(), name, city: newHotelCity.trim(), phone: '', email: '', createdAt: Date.now() }])
    setNewHotelName('')
    setNewHotelCity('')
    refresh()
  }

  const updateHotel = (id: string, patch: Partial<Hotel>) => {
    saveHotels(loadHotels().map((h) => (h.id === id ? { ...h, ...patch } : h)))
    refresh()
  }

  const deleteHotel = (id: string) => {
    saveHotels(loadHotels().filter((h) => h.id !== id))
    setConfirmHotelDelete(null)
    refresh()
  }

  const saveReservation = (r: ReservationRequest) => {
    const list = loadReservations()
    const i = list.findIndex((x) => x.id === r.id)
    if (i >= 0) list[i] = r
    else list.unshift(r)
    saveReservations(list)
    refresh()
  }

  const saveVoucher = (v: Voucher) => {
    const list = loadVouchers()
    const i = list.findIndex((x) => x.id === v.id)
    if (i >= 0) list[i] = v
    else list.unshift(v)
    saveVouchers(list)
    refresh()
  }

  const setResStatus = (id: string, status: DocStatus) => {
    saveReservations(loadReservations().map((r) => (r.id === id ? { ...r, status, updatedAt: Date.now() } : r)))
    refresh()
  }

  const setVoucherStatus = (id: string, status: DocStatus) => {
    saveVouchers(loadVouchers().map((v) => (v.id === id ? { ...v, status, updatedAt: Date.now() } : v)))
    refresh()
  }

  const deleteReservation = (id: string) => {
    saveReservations(loadReservations().filter((r) => r.id !== id))
    refresh()
  }

  const deleteVoucher = (id: string) => {
    saveVouchers(loadVouchers().filter((v) => v.id !== id))
    refresh()
  }

  const stats = useMemo(() => {
    return {
      hotels: hotels.length,
      reservations: reservations.length,
      pending: reservations.filter((r) => r.status === 'draft' || r.status === 'sent').length,
      approved: reservations.filter((r) => r.status === 'approved').length,
      vouchers: vouchers.length,
    }
  }, [hotels, reservations, vouchers])

  return (
    <div className="hotels-page">
      {/* ---------- پروفایل آژانس (سربرگ) ---------- */}
      <div className="card agency-card no-print">
        <div className="agency-head">
          <div>
            <span className="letter-logo big">{agency.logoText || '✈'}</span>
          </div>
          <div className="agency-brief">
            <b>{agency.name}</b>
            <div className="customer-note">{agency.address || 'آدرس ثبت نشده — برای سربرگ نامه تکمیل کنید'}</div>
          </div>
          <button className="sm-btn" type="button" onClick={() => setAgencyOpen((o) => !o)}>
            {agencyOpen ? 'بستن' : '✏️ مشخصات آژانس (سربرگ)'}
          </button>
        </div>
        {agencyOpen && (
          <div className="agency-form">
            <div className="field">
              <label>نام آژانس</label>
              <input type="text" value={agency.name} onChange={(e) => setAgency({ ...agency, name: e.target.value })} />
            </div>
            <div className="field">
              <label>آدرس</label>
              <input type="text" value={agency.address} onChange={(e) => setAgency({ ...agency, address: e.target.value })} />
            </div>
            <div className="field">
              <label>تلفن</label>
              <input type="text" value={agency.phone} onChange={(e) => setAgency({ ...agency, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>ایمیل</label>
              <input type="text" dir="ltr" value={agency.email} onChange={(e) => setAgency({ ...agency, email: e.target.value })} />
            </div>
            <div className="field">
              <label>نماد سربرگ (emoji/حرف)</label>
              <input type="text" value={agency.logoText} onChange={(e) => setAgency({ ...agency, logoText: e.target.value })} />
            </div>
            <button
              className="load-btn"
              type="button"
              onClick={() => {
                saveAgency(agency)
                setAgencyOpen(false)
              }}
            >
              💾 ذخیره
            </button>
          </div>
        )}
      </div>

      {/* ---------- آمار ---------- */}
      <div className="stat-grid">
        <div className="stat-card blue">
          <div className="stat-num">{stats.hotels}</div>
          <div className="stat-label">هتل‌های همکار</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-num">{stats.reservations}</div>
          <div className="stat-label">کل درخواست رزرو</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.pending}</div>
          <div className="stat-label">در انتظار پاسخ هتل</div>
        </div>
        <div className="stat-card green">
          <div className="stat-num">{stats.approved}</div>
          <div className="stat-label">تایید شده</div>
        </div>
        <div className="stat-card usd">
          <div className="stat-num">{stats.vouchers}</div>
          <div className="stat-label">واچر صادر شده</div>
        </div>
      </div>

      {/* ---------- افزودن هتل ---------- */}
      <div className="card add-customer">
        <div className="field">
          <label>نام هتل جدید</label>
          <input
            type="text"
            value={newHotelName}
            placeholder="مثلاً: هتل درویشی مشهد"
            onChange={(e) => setNewHotelName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHotel()}
          />
        </div>
        <div className="field">
          <label>شهر</label>
          <input type="text" value={newHotelCity} placeholder="مشهد" onChange={(e) => setNewHotelCity(e.target.value)} />
        </div>
        <button className="load-btn" type="button" onClick={addHotel}>
          + افزودن هتل
        </button>
      </div>

      {/* ---------- کارت هر هتل ---------- */}
      {hotels.length === 0 ? (
        <div className="card empty-state">
          هنوز هتلی ثبت نشده است. اولین هتل همکار را از فرم بالا اضافه کنید؛ بعد می‌توانید برایش درخواست رزرو و واچر صادر کنید.
        </div>
      ) : (
        hotels.map((h) => {
          const hRes = reservations.filter((r) => r.hotelId === h.id)
          const hVou = vouchers.filter((v) => v.hotelId === h.id)
          const open = expandedId === h.id
          return (
            <div className="card hotel-card" key={h.id}>
              <div className="hotel-head">
                <button type="button" className="expand-btn" onClick={() => setExpandedId(open ? null : h.id)} title="تاریخچه اسناد">
                  {open ? '▾' : '▸'}
                </button>
                <div className="customer-info">
                  <input
                    className="hotel-name-input"
                    type="text"
                    value={h.name}
                    onChange={(e) => updateHotel(h.id, { name: e.target.value })}
                  />
                  <div className="hotel-contact">
                    <input type="text" placeholder="شهر" value={h.city} onChange={(e) => updateHotel(h.id, { city: e.target.value })} />
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="تلفن"
                      value={h.phone}
                      onChange={(e) => updateHotel(h.id, { phone: e.target.value })}
                    />
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="ایمیل"
                      value={h.email}
                      onChange={(e) => updateHotel(h.id, { email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="customer-stats">
                  <div className="mini-stat yellow">
                    <b>{hRes.length}</b>
                    <span>درخواست</span>
                  </div>
                  <div className="mini-stat usd">
                    <b>{hVou.length}</b>
                    <span>واچر</span>
                  </div>
                </div>
                <div className="customer-actions">
                  <button className="sm-btn" type="button" onClick={() => setResDocFor({ hotel: h, initial: null })}>
                    📨 درخواست رزرو
                  </button>
                  <button className="sm-btn" type="button" onClick={() => setVoucherDocFor({ hotel: h, initial: null })}>
                    🎫 صدور واچر
                  </button>
                  {confirmHotelDelete === h.id ? (
                    <>
                      <button className="sm-btn danger" type="button" onClick={() => deleteHotel(h.id)}>
                        ✓ مطمئنم
                      </button>
                      <button className="sm-btn ghost" type="button" onClick={() => setConfirmHotelDelete(null)}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <button className="sm-btn danger" type="button" onClick={() => setConfirmHotelDelete(h.id)}>
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {open && (
                <div className="hotel-history">
                  <div className="doc-tabs">
                    <button type="button" className={docTab === 'reservations' ? 'tab active' : 'tab'} onClick={() => setDocTab('reservations')}>
                      📨 درخواست‌های رزرو ({hRes.length})
                    </button>
                    <button type="button" className={docTab === 'vouchers' ? 'tab active' : 'tab'} onClick={() => setDocTab('vouchers')}>
                      🎫 واچرها ({hVou.length})
                    </button>
                  </div>

                  {docTab === 'reservations' &&
                    (hRes.length === 0 ? (
                      <div className="empty-inline">برای این هتل هنوز درخواستی ثبت نشده.</div>
                    ) : (
                      hRes.map((r) => (
                        <div className="doc-row" key={r.id}>
                          <div className="doc-main">
                            <b>{r.title}</b>
                            <div className="doc-meta">
                              <span>📅 {faIso(r.checkIn)} → {faIso(r.checkOut)}</span>
                              <span>🌙 {r.nights} شب</span>
                              <span>🛏 {r.rooms.reduce((a, x) => a + x.count, 0)} اتاق</span>
                              <span>🕒 {faDateTime(r.createdAt)}</span>
                            </div>
                          </div>
                          <div className="doc-actions-row">
                            <select value={r.status} onChange={(e) => setResStatus(r.id, e.target.value as DocStatus)}>
                              {(Object.keys(DOC_STATUS_LABEL) as DocStatus[]).map((s) => (
                                <option key={s} value={s}>
                                  {DOC_STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                            <button className="sm-btn" type="button" onClick={() => setResDocFor({ hotel: h, initial: r })}>
                              ✏️ ویرایش
                            </button>
                            <button className="sm-btn danger" type="button" onClick={() => deleteReservation(r.id)}>
                              🗑
                            </button>
                          </div>
                        </div>
                      ))
                    ))}

                  {docTab === 'vouchers' &&
                    (hVou.length === 0 ? (
                      <div className="empty-inline">برای این هتل هنوز واچری صادر نشده.</div>
                    ) : (
                      hVou.map((v) => (
                        <div className="doc-row" key={v.id}>
                          <div className="doc-main">
                            <b dir="ltr">{v.code}</b> — <b>{v.guestName || 'بدون نام'}</b>
                            <div className="doc-meta">
                              <span>📅 {faIso(v.checkIn)} → {faIso(v.checkOut)}</span>
                              <span>🌙 {v.nights} شب</span>
                              <span>🛏 {v.roomType}</span>
                              <span>🕒 {faDateTime(v.createdAt)}</span>
                            </div>
                          </div>
                          <div className="doc-actions-row">
                            <select value={v.status} onChange={(e) => setVoucherStatus(v.id, e.target.value as DocStatus)}>
                              {(Object.keys(DOC_STATUS_LABEL) as DocStatus[]).map((s) => (
                                <option key={s} value={s}>
                                  {DOC_STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                            <button className="sm-btn" type="button" onClick={() => setVoucherDocFor({ hotel: h, initial: v })}>
                              ✏️ ویرایش
                            </button>
                            <button className="sm-btn danger" type="button" onClick={() => deleteVoucher(v.id)}>
                              🗑
                            </button>
                          </div>
                        </div>
                      ))
                    ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* ---------- مودال‌ها ---------- */}
      {resDocFor && (
        <ReservationDoc hotel={resDocFor.hotel} agency={agency} initial={resDocFor.initial} onClose={() => setResDocFor(null)} onSave={saveReservation} />
      )}
      {voucherDocFor && (
        <VoucherDoc hotel={voucherDocFor.hotel} agency={agency} initial={voucherDocFor.initial} onClose={() => setVoucherDocFor(null)} onSave={saveVoucher} />
      )}
    </div>
  )
}
