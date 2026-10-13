import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiSearch, FiCalendar } from 'react-icons/fi'
import StatusBadge from '../components/StatusBadge'
import LeaveActions from '../components/LeaveActions'
import useLeaveActions from '../useLeaveActions'
import { authHeader } from '../api'
import { fmtDate } from '../date'
import { STATUS_LABEL } from '../leaveLabels'
import './TeamLeaveAccept.css'

export default function TeamLeaveAccept() {
  const navigate = useNavigate()
  const [leaves, setLeaves] = useState([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all') // all | newest
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/leaves', { headers: authHeader() })
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setLeaves(await res.json())
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => { load() }, [load])
  const { ask, modal, error: actError } = useLeaveActions(load)

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase()
    let list = leaves.filter(
      (l) => !kw || [l.name, l.type, l.substitute, STATUS_LABEL[l.status]].some((s) => s.toLowerCase().includes(kw))
    )
    if (tab === 'newest') list = [...list].sort((a, b) => b.start.localeCompare(a.start))
    return list
  }, [leaves, q, tab])

  return (
    <div className="la">
      <div className="la__head">
        <button className="la__back" onClick={() => navigate('/team')} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>การลาทั้งหมด</h1>
        <label className="la__search">
          <FiSearch />
          <input placeholder="ค้นหารายการอื่น ..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <div className="la__tabs">
        <button className={tab === 'all' ? 'is-on' : ''} onClick={() => setTab('all')}>ทั้งหมด</button>
        <button className={tab === 'newest' ? 'is-on' : ''} onClick={() => setTab('newest')}>ใหม่-เก่า</button>
      </div>

      {(error || actError) && <p className="la__err">{error || actError}</p>}

      <div className="la__box">
        <div className="la__row la__row--head">
          <span>ลำดับ</span><span>ชื่อ</span><span>ประเภท</span><span>ระยะเวลา</span><span>ผู้แทน</span><span>สถานะ</span><span />
        </div>
        <div className="la__scroll">
          {rows.map((l, i) => (
            <div key={l.id} className="la__row la__row--item">
              <span>{i + 1}</span>
              <span>{l.name}</span>
              <span><i className="la__pill">{l.type}</i></span>
              <span><i className="la__date"><FiCalendar /> {fmtDate(l.start)} - {fmtDate(l.end)}</i></span>
              <span>{l.substitute}</span>
              <span><StatusBadge>{STATUS_LABEL[l.status]}</StatusBadge></span>
              <LeaveActions leave={l} onAsk={ask} />
            </div>
          ))}
          {!rows.length && !error && <p className="la__empty">ไม่พบรายการ</p>}
        </div>
      </div>

      {modal}
    </div>
  )
}
