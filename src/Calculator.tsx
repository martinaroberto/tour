import { useCallback, useEffect, useMemo, useState } from 'react'
import Invoice, { type InvoiceData } from './Invoice'
import {
  computeTrip,
  CUSTOM_TPL_KEY,
  formatNum,
  inputNumber,
  loadJSON,
  rawNumber,
  saveJSON,
  STATE_KEY,
  TEMPLATES,
  uid,
  type CustomTemplate,
  type Item,
  type Mode,
  type ProfitMode,
} from './calc'
import {
  computeFromData,
  loadCustomers,
  loadTrips,
  saveTrips,
  toTripData,
  type Customer,
  type Trip,
  type TripData,
  type TripStatus,
} from './storage'

const faDate = () => {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date())
  } catch {
    return new Date().toLocaleDateString()
  }
}

function makeItems(rows: [string, Mode][]): Item[] {
  return rows.map(([desc, mode]) => ({ id: uid(), desc, price: '', mode }))
}

interface DraftState {
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

export default function Calculator({
  editTarget,
  onDone,
  onCancelEdit,
}: {
  /** وقتی از صفحه تورها با «ویرایش» می‌آییم، این پر است */
  editTarget: { trip: Trip } | null
  /** بعد از ذخیره صدا زده می‌شود */
  onDone: () => void
  onCancelEdit: () => void
}) {
  const editing = !!editTarget

  // اگر در حال ویرایشیم، داده‌ها از تور بارگذاری می‌شوند؛ وگرنه از پیش‌نویس ذخیره‌شده
  const saved = editTarget ? null : loadJSON<DraftState | null>(STATE_KEY, null)
  const src = editTarget ? editTarget.trip.data : saved

  const [tripTitle, setTripTitle] = useState(src?.tripTitle ?? 'تور قم و مشهد هوایی')
  const [passengers, setPassengers] = useState(src?.passengers ?? '12')
  const [exchangeRate, setExchangeRate] = useState(src?.exchangeRate ?? '60000')
  const [profitPerPerson, setProfitPerPerson] = useState(src?.profitPerPerson ?? '50')
  const [profitMode, setProfitMode] = useState<ProfitMode>(src?.profitMode ?? 'usd')
  const [roundUsd, setRoundUsd] = useState(src?.roundUsd ?? 0)
  const [roundIqd, setRoundIqd] = useState(src?.roundIqd ?? 0)
  const [repFee, setRepFee] = useState(src?.repFee ?? '')
  const [leaderFee, setLeaderFee] = useState(src?.leaderFee ?? '')
  const [iqdRateStr, setIqdRateStr] = useState(src?.iqdRate ?? '1310')
  const [items, setItems] = useState<Item[]>(src?.items?.length ? src.items : makeItems(TEMPLATES[0].rows))
  const [persian, setPersian] = useState(src?.persian ?? true)
  const [templateName, setTemplateName] = useState(TEMPLATES[0].name)
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() =>
    loadJSON<CustomTemplate[]>(CUSTOM_TPL_KEY, []),
  )
  const [newTemplateName, setNewTemplateName] = useState('')
  const [deletedRow, setDeletedRow] = useState<{ item: Item; index: number } | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [status, setStatus] = useState<TripStatus>(editTarget?.trip.status ?? 'quote')
  const [customerId, setCustomerId] = useState<string>(editTarget?.trip.customerId ?? '')
  const [customers] = useState<Customer[]>(() => loadCustomers())
  const [saveMsg, setSaveMsg] = useState('')

  // ---- ذخیره خودکار پیش‌نویس (فقط برای تور جدید) ----
  const draft: DraftState = {
    tripTitle,
    passengers,
    exchangeRate,
    profitPerPerson,
    profitMode,
    roundUsd,
    roundIqd,
    repFee,
    leaderFee,
    iqdRate: iqdRateStr,
    items,
    persian,
  }
  useEffect(() => {
    if (editing) return
    saveJSON(STATE_KEY, draft)
  }, [draft, editing])

  // نکته مهم: فیلدهای عددی با کاما فرمت می‌شوند (مثل "60,000") — باید با inputNumber پارس شوند
  const numPassengers = Math.max(1, Math.floor(inputNumber(passengers) || 1))
  const numRate = Math.max(1, inputNumber(exchangeRate) || 1)
  const numProfit = inputNumber(profitPerPerson)
  const iqdRate = Math.max(1, inputNumber(iqdRateStr) || 1)

  const fmt = useCallback((n: number, frac = 0) => formatNum(n, persian, frac), [persian])

  const rows = useMemo(
    () =>
      items.map((it) => {
        const price = rawNumber(it.price)
        const rowTotal = it.mode === 'tot' ? price : price * numPassengers
        return { item: it, price, rowTotal }
      }),
    [items, numPassengers],
  )

  const calcInput = useMemo(
    () => ({
      rows: rows.map((r) => ({ price: r.price, mode: r.item.mode })),
      repFee: inputNumber(repFee),
      leaderFee: inputNumber(leaderFee),
      passengers: numPassengers,
      exchangeRate: numRate,
      iqdRate,
      profit: numProfit,
      profitMode,
      roundUsd,
      roundIqd,
    }),
    [rows, repFee, leaderFee, numPassengers, numRate, iqdRate, numProfit, profitMode, roundUsd, roundIqd],
  )

  const totals = useMemo(() => computeTrip(calcInput), [calcInput])

  // ---- جدول مقایسه گروه‌ها: همان سناریو با نفرات مختلف ----
  const comparison = useMemo(() => {
    const paxList = [10, 15, 20, 25, 30, 40, 50]
    return paxList.map((pax) => ({
      pax,
      res: computeTrip({ ...calcInput, passengers: pax }),
    }))
  }, [calcInput])

  const formatPrice = useCallback((value: string) => {
    const num = rawNumber(value)
    return num ? num.toLocaleString('en-US', { maximumFractionDigits: 0 }) : ''
  }, [])

  const updateItem = (id: string, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const addItem = () => {
    setItems((prev) => [...prev, { id: uid(), desc: '', price: '', mode: 'pp' }])
  }

  const removeItem = (id: string) => {
    const index = items.findIndex((it) => it.id === id)
    if (index < 0) return
    setDeletedRow({ item: items[index], index })
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const undoRemove = () => {
    if (!deletedRow) return
    setItems((prev) => {
      const next = [...prev]
      next.splice(Math.min(deletedRow.index, next.length), 0, deletedRow.item)
      return next
    })
    setDeletedRow(null)
  }

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((it) => it.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const loadTemplate = () => {
    const t = TEMPLATES.find((t) => t.name === templateName)
    if (!t) return
    setItems(makeItems(t.rows))
    setTripTitle('تور ' + t.name)
  }

  // ---- قالب‌ساز شخصی ----
  const saveCustomTemplate = () => {
    const name = newTemplateName.trim() || tripTitle.trim() || 'قالب بدون نام'
    const tpl: CustomTemplate = {
      name,
      rows: items.map((it) => ({ desc: it.desc, price: it.price, mode: it.mode })),
    }
    const next = [...customTemplates.filter((t) => t.name !== name), tpl]
    setCustomTemplates(next)
    saveJSON(CUSTOM_TPL_KEY, next)
    setNewTemplateName('')
  }

  const loadCustomTemplate = (name: string) => {
    const tpl = customTemplates.find((t) => t.name === name)
    if (!tpl) return
    setItems(tpl.rows.map((r) => ({ ...r, id: uid() })))
    setTripTitle(tpl.name)
  }

  const deleteCustomTemplate = (name: string) => {
    const next = customTemplates.filter((t) => t.name !== name)
    setCustomTemplates(next)
    saveJSON(CUSTOM_TPL_KEY, next)
  }

  // ---------- ذخیره تور ----------

  const buildTripData = (): TripData => toTripData(draft)

  const saveTrip = () => {
    const data = buildTripData()
    const result = computeFromData(data)
    const trips = loadTrips()
    const title = tripTitle.trim() || 'تور بدون عنوان'

    if (editing && editTarget) {
      const idx = trips.findIndex((t) => t.id === editTarget.trip.id)
      if (idx >= 0) {
        trips[idx] = {
          ...trips[idx],
          title,
          status,
          customerId: customerId || null,
          data,
          result,
          updatedAt: Date.now(),
        }
        saveTrips(trips)
        setSaveMsg('✓ تغییرات تور ذخیره شد')
        window.setTimeout(onDone, 600)
        return
      }
    }

    const trip: Trip = {
      id: uid(),
      customerId: customerId || null,
      title,
      status,
      data,
      result,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    trips.unshift(trip)
    saveTrips(trips)
    setSaveMsg('✓ تور با موفقیت ذخیره شد')
    window.setTimeout(onDone, 600)
  }

  const invoiceData = useMemo<InvoiceData>(
    () => ({
      tripTitle,
      date: faDate(),
      passengers: numPassengers,
      rows: rows.map((r) => ({ desc: r.item.desc, price: r.price, mode: r.item.mode, rowTotal: r.rowTotal })),
      repFee: inputNumber(repFee),
      leaderFee: inputNumber(leaderFee),
      totalToman: totals.totalToman,
      perPersonToman: totals.perPersonToman,
      perPersonUsd: totals.perPersonUsd,
      profitUsd: totals.profitUsd,
      finalPerPerson: totals.finalPerPerson,
      finalPerPersonIqd: totals.finalPerPersonIqd,
      persian,
    }),
    [tripTitle, numPassengers, rows, repFee, leaderFee, totals, persian],
  )

  return (
    <div className="calc-page">
      {editing && (
        <div className="edit-banner">
          ✏️ در حال ویرایش تور «{editTarget?.trip.title}» — پس از ذخیره به لیست تورها برمی‌گردید.
          <button type="button" className="link-btn" onClick={onCancelEdit}>
            انصراف
          </button>
        </div>
      )}

      <div className="card template-bar">
        <div className="field">
          <label>قالب تور</label>
          <select value={templateName} onChange={(e) => setTemplateName(e.target.value)}>
            {TEMPLATES.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button className="load-btn" type="button" onClick={loadTemplate}>
          فراخوانی قالب
        </button>
      </div>
      <p className="hint">
        با فراخوانی قالب، ردیف‌های توضیحات همان تور پر می‌شود و قیمت‌ها خالی می‌مانند تا خودتان وارد کنید. کنار هر
        قیمت: «× نفر» یعنی قیمت سرانه است (مثل پرواز و هتل) و «÷ نفر» یعنی هزینه کل گروه است و بین نفرات تقسیم می‌شود.
      </p>

      {customTemplates.length > 0 && (
        <>
          <div className="card custom-templates">
            <div className="field">
              <label>قالب‌های ذخیره‌شده شما</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) loadCustomTemplate(e.target.value)
                  e.currentTarget.value = ''
                }}
              >
                <option value="">— انتخاب قالب شخصی —</option>
                {customTemplates.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {customTemplates.map((t) => (
              <button
                key={t.name}
                type="button"
                className="tpl-del"
                title={'حذف قالب ' + t.name}
                onClick={() => deleteCustomTemplate(t.name)}
              >
                ✕ {t.name}
              </button>
            ))}
          </div>
          <p className="hint">از لیست بالا قالب شخصی را صدا کنید؛ با دکمه ✕ حذفش کنید.</p>
        </>
      )}

      <div className="card save-template">
        <div className="field">
          <label>ذخیره قالب شخصی (ردیف‌های فعلی)</label>
          <input
            type="text"
            value={newTemplateName}
            placeholder="اسم قالب — خالی بگذارید از عنوان تور استفاده می‌شود"
            onChange={(e) => setNewTemplateName(e.target.value)}
          />
        </div>
        <button className="load-btn" type="button" onClick={saveCustomTemplate}>
          💾 ذخیره قالب
        </button>
      </div>

      <div className="card settings">
        <div className="field">
          <label>عنوان تور</label>
          <input
            type="text"
            value={tripTitle}
            placeholder="مثلاً: قم و مشهد رشت هوایی"
            onChange={(e) => setTripTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label>مشتری (شرکت / شخص)</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— بدون مشتری —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>تعداد نفرات</label>
          <input
            type="text"
            inputMode="numeric"
            value={passengers}
            onChange={(e) => setPassengers(formatPrice(e.target.value))}
          />
        </div>
        <div className="field">
          <label>نرخ ارز (تومان به ازای هر دلار)</label>
          <input
            type="text"
            inputMode="numeric"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(formatPrice(e.target.value))}
          />
        </div>
        <div className="field">
          <label>نرخ دینار عراق (IQD به ازای هر ۱ دلار)</label>
          <input
            type="text"
            inputMode="numeric"
            value={iqdRateStr}
            onChange={(e) => setIqdRateStr(formatPrice(e.target.value))}
          />
        </div>
      </div>

      <div className="card settings">
        <div className="field profit-field">
          <label>سود هر نفر</label>
          <div className="profit-row">
            <input
              type="text"
              inputMode="numeric"
              value={profitPerPerson}
              placeholder="0"
              onChange={(e) => setProfitPerPerson(formatPrice(e.target.value))}
            />
            <button
              type="button"
              className="mode-toggle"
              data-mode={profitMode}
              title="تغییر نوع سود"
              onClick={() => setProfitMode((m) => (m === 'usd' ? 'percent' : 'usd'))}
            >
              {profitMode === 'usd' ? 'دلار' : '٪ درصد'}
            </button>
          </div>
        </div>
        <div className="field">
          <label>گرد کردن دلار (مضرب)</label>
          <select value={roundUsd} onChange={(e) => setRoundUsd(Number(e.target.value))}>
            <option value={0}>بدون گرد کردن</option>
            <option value={1}>یک دلار</option>
            <option value={5}>۵ دلار</option>
            <option value={10}>۱۰ دلار</option>
          </select>
        </div>
        <div className="field">
          <label>گرد کردن دینار (مضرب)</label>
          <select value={roundIqd} onChange={(e) => setRoundIqd(Number(e.target.value))}>
            <option value={0}>بدون گرد کردن</option>
            <option value={250}>۲۵۰ دینار</option>
            <option value={500}>۵۰۰ دینار</option>
            <option value={1000}>۱۰۰۰ دینار</option>
          </select>
        </div>
        <div className="field">
          <label>نمایش ارقام</label>
          <select value={persian ? 'fa' : 'en'} onChange={(e) => setPersian(e.target.value === 'fa')}>
            <option value="fa">فارسی (۱۲۳)</option>
            <option value="en">انگلیسی (123)</option>
          </select>
        </div>
      </div>

      <div className="card settings">
        <div className="field">
          <label>هزینه ثابت نماینده آژانس (تومان – کل تور، نه سرانه)</label>
          <input
            type="text"
            inputMode="numeric"
            value={repFee}
            placeholder="0"
            onChange={(e) => setRepFee(formatPrice(e.target.value))}
          />
        </div>
        <div className="field">
          <label>هزینه ثابت تورلیدر ایرانی (تومان – کل تور، نه سرانه)</label>
          <input
            type="text"
            inputMode="numeric"
            value={leaderFee}
            placeholder="0"
            onChange={(e) => setLeaderFee(formatPrice(e.target.value))}
          />
        </div>
      </div>
      <p className="hint">
        این دو مورد ثابت هستند و با عوض‌کردن قالب تور خالی نمی‌شوند — فقط یک‌بار وارد کنید، خودش هر بار بین تعداد
        نفرات همان تور تقسیم می‌شود.
      </p>

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th style={{ width: '38%' }}>توضیحات (پرواز، هتل، گشت، ماشین و ...)</th>
              <th style={{ width: '26%' }}>قیمت (تومان)</th>
              <th style={{ width: '20%' }}>جمع برای کل گروه</th>
              <th style={{ width: '10%' }}>جابه‌جایی</th>
              <th style={{ width: '6%' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, price, rowTotal }, index) => (
              <tr key={item.id}>
                <td className="desc-cell">
                  <input
                    type="text"
                    value={item.desc}
                    placeholder="توضیحات ردیف"
                    onChange={(e) => updateItem(item.id, { desc: e.target.value })}
                  />
                </td>
                <td>
                  <div className="price-cell">
                    <button
                      type="button"
                      className="mode-toggle"
                      data-mode={item.mode}
                      onClick={() => updateItem(item.id, { mode: item.mode === 'tot' ? 'pp' : 'tot' })}
                    >
                      {item.mode === 'tot' ? '÷ نفر' : '× نفر'}
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="price"
                      value={item.price}
                      placeholder="0"
                      onChange={(e) => updateItem(item.id, { price: formatPrice(e.target.value) })}
                    />
                  </div>
                </td>
                <td className="rowtotal">
                  {fmt(rowTotal)}
                  <small>هر نفر: {fmt(item.mode === 'tot' ? rowTotal / numPassengers : price)}</small>
                </td>
                <td>
                  <button
                    type="button"
                    className="mv-btn"
                    disabled={index === 0}
                    title="بالا"
                    onClick={() => moveItem(item.id, -1)}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="mv-btn"
                    disabled={index === rows.length - 1}
                    title="پایین"
                    onClick={() => moveItem(item.id, 1)}
                  >
                    ▼
                  </button>
                </td>
                <td>
                  <button type="button" className="rm-btn" title="حذف ردیف" onClick={() => removeItem(item.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-actions">
          <button className="add-row" type="button" onClick={addItem}>
            + افزودن ردیف
          </button>
          {deletedRow && (
            <button className="undo-btn" type="button" onClick={undoRemove}>
              ↩ بازگرداندن «{deletedRow.item.desc || 'ردیف خالی'}»
            </button>
          )}
        </div>
      </div>

      <div className="card summary">
        <div className="row">
          <span>جمع کل (تومان)</span>
          <b>{fmt(totals.totalToman)}</b>
        </div>
        <div className="row">
          <span>جمع کل هر نفر (تومان)</span>
          <b>{fmt(totals.perPersonToman)}</b>
        </div>
        <div className="row">
          <span>سهم هر نفر از هزینه‌های ثابت (نماینده + تورلیدر)</span>
          <b>{fmt(totals.fixedFeesPerPerson)} تومان</b>
        </div>
        <div className="row">
          <span>سود کل گروه</span>
          <b>{fmt(totals.profitUsd * numPassengers, 0)} دلار</b>
        </div>
        <div className="row">
          <span>جمع کل تور (دلار)</span>
          <b>{fmt(totals.totalUsd, 2)}</b>
        </div>
        <div className="final">
          فروش نهایی به هر مشتری: {fmt(totals.finalPerPerson, 2)} دلار
          <div className="final-sub">معادل تقریبی: {fmt(totals.finalPerPersonIqd)} دینار عراق</div>
        </div>
      </div>

      <div className="card comparison no-print">
        <h2>مقایسه گروه‌ها</h2>
        <p className="hint">همین سناریو با تعداد نفرات مختلف — سود و گرد کردن اعمال شده.</p>
        <div className="table-scroll">
          <table className="cmp-table">
            <thead>
              <tr>
                <th>نفرات</th>
                {comparison.map((c) => (
                  <th key={c.pax}>{fmt(c.pax)} نفر</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="label">فروش هر نفر (دلار)</td>
                {comparison.map((c) => (
                  <td key={c.pax} className={c.pax === numPassengers ? 'hl' : ''}>
                    {fmt(c.res.finalPerPerson, 2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="label">فروش هر نفر (دینار)</td>
                {comparison.map((c) => (
                  <td key={c.pax} className={c.pax === numPassengers ? 'hl' : ''}>
                    {fmt(c.res.finalPerPersonIqd)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="label">سود کل گروه (دلار)</td>
                {comparison.map((c) => (
                  <td key={c.pax} className={c.pax === numPassengers ? 'hl' : ''}>
                    {fmt(c.res.profitUsd * c.pax)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- نوار ذخیره تور ---- */}
      <div className="card save-trip-bar no-print">
        <div className="field">
          <label>وضعیت این تور</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TripStatus)}>
            <option value="quote">اعلام قیمت (پیش‌فاکتور)</option>
            <option value="confirmed">تایید شده</option>
            <option value="completed">تکمیل شده</option>
          </select>
        </div>
        <button className="load-btn big" type="button" onClick={saveTrip}>
          {editing ? '💾 ذخیره تغییرات تور' : '💾 ذخیره این تور'}
        </button>
        {saveMsg && <span className="save-msg">{saveMsg}</span>}
      </div>

      <div className="print-bar no-print">
        <button className="load-btn big ghost-btn" type="button" onClick={() => setInvoiceOpen(true)}>
          🧾 صدور پیش‌فاکتور چاپی / PDF
        </button>
      </div>

      <Invoice data={invoiceData} open={invoiceOpen} onClose={() => setInvoiceOpen(false)} />
    </div>
  )
}
