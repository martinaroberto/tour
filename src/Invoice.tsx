import { useEffect } from 'react'
import { formatNum, type Mode } from './calc'

export interface InvoiceData {
  tripTitle: string
  date: string
  passengers: number
  rows: { desc: string; price: number; mode: Mode; rowTotal: number }[]
  repFee: number
  leaderFee: number
  totalToman: number
  perPersonToman: number
  perPersonUsd: number
  profitUsd: number
  finalPerPerson: number
  finalPerPersonIqd: number
  persian: boolean
}

export default function Invoice({ data, open, onClose }: { data: InvoiceData; open: boolean; onClose: () => void }) {
  // وقتی پنجره باز می‌شه، فقط همین بخش چاپ بشه
  useEffect(() => {
    if (!open) return
    document.body.classList.add('print-mode')
    const done = () => document.body.classList.remove('print-mode')
    window.addEventListener('afterprint', done)
    return () => {
      window.removeEventListener('afterprint', done)
      document.body.classList.remove('print-mode')
    }
  }, [open])

  useEffect(() => {
    if (open) window.print()
  }, [open])

  if (!open) return null

  const f = (n: number, frac = 0) => formatNum(n, data.persian, frac)

  return (
    <div className="invoice-overlay" onClick={onClose}>
      <div className="invoice" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-head">
          <div>
            <div className="invoice-brand">پیش‌فاکتور تور</div>
            <div className="invoice-title">{data.tripTitle}</div>
          </div>
          <div className="invoice-meta">
            <div>تاریخ: {data.date}</div>
            <div>تعداد نفرات: {f(data.passengers)}</div>
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>شرح خدمات</th>
              <th>نوع</th>
              <th>قیمت واحد (تومان)</th>
              <th>جمع (تومان)</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i}>
                <td>{f(i + 1)}</td>
                <td className="rt">{r.desc || '—'}</td>
                <td>{r.mode === 'tot' ? 'کل گروه' : 'هر نفر'}</td>
                <td className="num">{f(r.price)}</td>
                <td className="num">{f(r.rowTotal)}</td>
              </tr>
            ))}
            {data.repFee > 0 && (
              <tr>
                <td>{f(data.rows.length + 1)}</td>
                <td className="rt">نماینده آژانس</td>
                <td>کل گروه</td>
                <td className="num">{f(data.repFee)}</td>
                <td className="num">{f(data.repFee)}</td>
              </tr>
            )}
            {data.leaderFee > 0 && (
              <tr>
                <td>{f(data.rows.length + 1 + (data.repFee > 0 ? 1 : 0))}</td>
                <td className="rt">تورلیدر ایرانی</td>
                <td>کل گروه</td>
                <td className="num">{f(data.leaderFee)}</td>
                <td className="num">{f(data.leaderFee)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="invoice-summary">
          <div className="row">
            <span>جمع کل هزینه‌ها</span>
            <b>{f(data.totalToman)} تومان</b>
          </div>
          <div className="row">
            <span>هزینه هر نفر (بدون سود)</span>
            <b>
              {f(data.perPersonToman)} تومان ≈ {f(data.perPersonUsd, 2)} دلار
            </b>
          </div>
          <div className="row">
            <span>سود سازمان</span>
            <b>{f(data.profitUsd, 2)} دلار</b>
          </div>
          <div className="row final">
            <span>قیمت فروش هر نفر</span>
            <b>{f(data.finalPerPerson, 2)} دلار</b>
          </div>
          <div className="row final sub">
            <span>معادل دینار عراق</span>
            <b>{f(data.finalPerPersonIqd)} IQD</b>
          </div>
        </div>

        <div className="invoice-actions no-print">
          <button type="button" onClick={() => window.print()}>
            🖨 چاپ / ذخیره PDF
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    </div>
  )
}
