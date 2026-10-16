import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Tooltip,
} from 'recharts'
import { FiCalendar, FiUser, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { displayName } from '../auth'
import './Home.css'

const BAR_COLORS = ['#143f77', '#d4af37', '#8b5cf6', '#f97316', '#0ea5e9', '#10b981', '#64748b']
const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const pad = (n) => String(n).padStart(2, '0')
const todayTH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

function authHeader() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { Authorization: 'Bearer ' + t }
}

export default function Home() {
  const today = todayTH()
  const [year, setYear] = useState(today.slice(0, 4)) // '' = ทุกปี
  const [month, setMonth] = useState(today.slice(5, 7)) // '' = ทั้งปี
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const period = year ? (month ? `${year}-${month}` : year) : ''

  useEffect(() => {
    let alive = true
    setBusy(true)
    fetch('/api/dashboard' + (period ? `?period=${period}` : ''), { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('โหลดข้อมูลไม่สำเร็จ'))))
      .then((d) => { if (alive) { setData(d); setError('') } })
      .catch((e) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setBusy(false) })
    return () => { alive = false }
  }, [period])

  function step(delta) {
    if (!year || !month) return
    const d = new Date(Date.UTC(Number(year), Number(month) - 1 + delta, 1))
    setYear(String(d.getUTCFullYear()))
    setMonth(pad(d.getUTCMonth() + 1))
  }

  if (error && !data) return <p className="home__msg">{error}</p>
  if (!data) return <p className="home__msg">กำลังโหลด...</p>

  const { stats, teamWork, monthly, urgent, years } = data
  const label = !year ? 'ทุกช่วงเวลา' : month ? `${MONTHS_TH[Number(month) - 1]} ${year}` : `ทั้งปี ${year}`

  return (
    <div className="home">
      <h1 className="home__hello">สวัสดี คุณ {displayName()}</h1>

      <div className="home__filter">
        <strong>ข้อมูลของ: {label}</strong>
        <div className="home__filterctl">
          <button type="button" onClick={() => step(-1)} disabled={!month} aria-label="เดือนก่อนหน้า"><FiChevronLeft /></button>
          <select value={month} disabled={!year} onChange={(e) => setMonth(e.target.value)} aria-label="เดือน">
            <option value="">ทั้งปี</option>
            {MONTHS_TH.map((n, i) => <option key={n} value={pad(i + 1)}>{n}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => { setYear(e.target.value); if (!e.target.value) setMonth('') }}
            aria-label="ปี"
          >
            <option value="">ทุกปี</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => step(1)} disabled={!month} aria-label="เดือนถัดไป"><FiChevronRight /></button>
          <button type="button" className="home__now" onClick={() => { setYear(today.slice(0, 4)); setMonth(today.slice(5, 7)) }}>
            เดือนนี้
          </button>
        </div>
      </div>
      {error && <p className="home__msg">{error}</p>}

      <div className={'home__stats' + (busy ? ' is-busy' : '')}>
        <StatCard value={stats.total} label="งานทั้งหมด" color="#1a4f9c" />
        <StatCard value={stats.pending} label="รอดำเนินการ" color="#ef2b3a" active />
        <StatCard value={stats.inProgress} label="กำลังดำเนินการ" color="#f2c230" />
        <StatCard value={stats.done} label="เสร็จสมบูรณ์" color="#2fc45e" />
      </div>

      <div className="home__charts">
        <section className="panel">
          <h2>งานของแต่ละทีม <small>({label})</small></h2>
          <div className="panel__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamWork} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" barSize={42}>
                  {teamWork.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <h2>จำนวนงานในแต่ละเดือน <small>(ปี {year || today.slice(0, 4)})</small></h2>
          <div className="panel__chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eee" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="linear" dataKey="value" stroke="#ec4899" strokeWidth={1}
                  dot={{ r: 2, fill: '#fff', stroke: '#ec4899' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="urgent">
        <h2>งานด่วน / เลยกำหนด</h2>
        <ul>
          {urgent.map((w) => (
            <li key={w.id}>
              <Link to={`/work/${w.id}`} className="urgent__row">
                <span className="urgent__title">{w.title}</span>
                <span className="chip chip--team">{w.team}</span>
                <span className="urgent__label">กำหนดส่ง</span>
                <span className="chip chip--date"><FiCalendar /> {w.due}</span>
                <span className="urgent__label">ผู้รับผิดชอบ</span>
                <span className="owner"><FiUser /> {w.owner}</span>
                <span className="urgent__label">สถานะ</span>
                <StatusBadge>{w.status}</StatusBadge>
              </Link>
            </li>
          ))}
          {!urgent.length && <li className="home__msg">ไม่มีงานด่วนหรือเลยกำหนด</li>}
        </ul>
      </section>
    </div>
  )
}
