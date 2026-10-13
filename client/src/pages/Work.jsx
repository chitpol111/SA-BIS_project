import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiCalendar, FiChevronRight, FiEdit2, FiChevronDown } from 'react-icons/fi'
import StatusBadge from '../components/StatusBadge'
import './Work.css'

const TYPE_CLASS = { 'ไฟฟ้า': 'elec', 'โยธา': 'civil', 'คนสวน': 'garden' }

function authHeader() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { Authorization: 'Bearer ' + t }
}

const fmt = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Work() {
  const navigate = useNavigate()
  const [works, setWorks] = useState([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all') // all | newest
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/work', { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('โหลดข้อมูลไม่สำเร็จ'))))
      .then(setWorks)
      .catch((e) => setError(e.message))
  }, [])

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase()
    let list = works.filter((w) =>
      !kw || [w.title, w.type, w.status, w.priority].some((s) => s.toLowerCase().includes(kw))
    )
    if (tab === 'newest') list = [...list].sort((a, b) => b.start.localeCompare(a.start))
    return list
  }, [works, q, tab])

  return (
    <div className="work">
      <div className="work__head">
        <h1>งานที่ต้องจัดการ</h1>
        <label className="work__search">
          <FiSearch />
          <input placeholder="ค้นหารายการอื่น ..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <div className="work__tabs">
        <button className={tab === 'all' ? 'is-active' : ''} onClick={() => setTab('all')}>ทั้งหมด</button>
        <button className={tab === 'newest' ? 'is-active' : ''} onClick={() => setTab('newest')}>ใหม่-เก่า</button>
      </div>

      {error && <p className="work__msg">{error}</p>}

      <div className="work__table">
        <div className="work__row work__row--head">
          <span>ลำดับ</span><span>เรื่อง</span><span>ประเภท</span>
          <span>ระยะเวลา</span><span>ความสำคัญ</span><span>สถานะ</span><span />
        </div>

        {rows.map((w, i) => (
          <div key={w.id} className="work__row work__row--item" role="link" tabIndex={0}
            onClick={() => navigate(`/work/${w.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/work/${w.id}`)}>
            <span>{i + 1}</span>
            <span>{w.title}</span>
            <span><i className={'tag tag--' + (TYPE_CLASS[w.type] || 'elec')}>▼ {w.type}</i></span>
            <span><i className="date"><FiCalendar /> {fmt(w.start)} - {fmt(w.end)}</i></span>
            <span>
              <i className={'prio ' + (w.priority === 'ด่วนมาก' ? 'prio--high' : 'prio--normal')}>
                {w.priority} <FiChevronDown />
              </i>
            </span>
            <span className="work__status">
              <StatusBadge>{w.status}</StatusBadge>
              {w.status === 'มอบหมายแล้ว' && (
                <button className="work__edit" aria-label="แก้ไข"
                  onClick={(e) => { e.stopPropagation(); navigate(`/work/${w.id}`) }}>
                  <FiEdit2 />
                </button>
              )}
            </span>
            <span className="work__go"><FiChevronRight /></span>
          </div>
        ))}

        {!rows.length && !error && <p className="work__msg">ไม่พบรายการ</p>}
      </div>
    </div>
  )
}
