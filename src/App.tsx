import { useState } from 'react'
import Calculator from './Calculator'
import Customers from './Customers'
import Hotels from './Hotels'
import Trips from './Trips'
import type { Trip } from './storage'

type Tab = 'calc' | 'trips' | 'customers' | 'hotels'

export default function App() {
  const [tab, setTab] = useState<Tab>('calc')
  const [editTrip, setEditTrip] = useState<Trip | null>(null)

  const openEdit = (trip: Trip) => {
    setEditTrip(trip)
    setTab('calc')
  }

  const newTripFor = (_customerId: string) => {
    setEditTrip(null)
    setTab('calc')
  }

  return (
    <div className="wrap">
      <h1>سامانه قیمت‌گذاری و مدیریت تور</h1>

      <nav className="tabs no-print">
        <button type="button" className={tab === 'calc' ? 'tab active' : 'tab'} onClick={() => (editTrip ? null : setTab('calc'))}>
          🧮 محاسبه‌گر
        </button>
        <button type="button" className={tab === 'trips' ? 'tab active' : 'tab'} onClick={() => setTab('trips')}>
          📋 تورها
        </button>
        <button type="button" className={tab === 'customers' ? 'tab active' : 'tab'} onClick={() => setTab('customers')}>
          🏢 مشتریان
        </button>
        <button type="button" className={tab === 'hotels' ? 'tab active' : 'tab'} onClick={() => setTab('hotels')}>
          🏨 هتل‌ها و واچر
        </button>
      </nav>

      {tab === 'calc' && (
        <Calculator
          editTarget={editTrip ? { trip: editTrip } : null}
          onDone={() => {
            setEditTrip(null)
            setTab('trips')
          }}
          onCancelEdit={() => {
            setEditTrip(null)
          }}
        />
      )}
      {tab === 'trips' && <Trips onEdit={openEdit} />}
      {tab === 'customers' && <Customers onNewTrip={newTripFor} />}
      {tab === 'hotels' && <Hotels />}
    </div>
  )
}
