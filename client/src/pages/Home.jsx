import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Tooltip,
} from 'recharts'
import { FiCalendar, FiUser } from 'react-icons/fi'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { displayName } from '../auth'
import './Home.css'

const BAR_COLORS = ['#143f77', '#d4af37', '#8b5cf6', '#f97316', '#0ea5e9', '#10b981', '#64748b']

function authHeader() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { Authorization: 'Bearer ' + t }
}

export default function Home() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null')

  useEffect(() => {
    fetch('/api/dashboard', { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('โหลดข้อมูลไม่สำเร็จ'))))
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="home__msg">{error}</p>
  if (!data) return <p className="home__msg">กำลังโหลด...</p>

  const { stats, teamWork, monthly, urgent } = data

  return (
    <div className="home">
      <h1 className="home__hello">สวัสดี คุณ {displayName()}</h1>

      <div className="home__stats">
        <StatCard value={stats.total} label="งานทั้งหมด" color="#1a4f9c" />
        <StatCard value={stats.pending} label="รอดำเนินการ" color="#ef2b3a" active />
        <StatCard value={stats.inProgress} label="กำลังดำเนินการ" color="#f2c230" />
        <StatCard value={stats.done} label="เสร็จสมบูรณ์" color="#2fc45e" />
      </div>

      <div className="home__charts">
        <section className="panel">
          <h2>งานของแต่ละทีม</h2>
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
          <h2>จำนวนงานในแต่ละเดือน</h2>
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
        </ul>
      </section>
    </div>
  )
}
