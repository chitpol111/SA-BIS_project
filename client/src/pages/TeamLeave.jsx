import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, LabelList } from 'recharts'
import { FiChevronLeft, FiCalendar } from 'react-icons/fi'
import StatusBadge from '../components/StatusBadge'
import LeaveActions from '../components/LeaveActions'
import useLeaveActions from '../useLeaveActions'
import { authHeader } from '../api'
import { fmtDate } from '../date'
import { STATUS_LABEL } from '../leaveLabels'
import './TeamLeave.css'

const BAR_COLORS = ['#1e1578', '#5c5ce6', '#a5a5f5', '#fbd5e8']

export default function TeamLeave() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [leaves, setLeaves] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const h = { headers: authHeader() }
      const [s, l] = await Promise.all([fetch('/api/leaves/summary', h), fetch('/api/leaves', h)])
      if (!s.ok || !l.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setSummary(await s.json())
      setLeaves(await l.json())
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => { load() }, [load])
  const { ask, modal, error: actError } = useLeaveActions(load)

  if (error) return <p className="tl__msg">{error}</p>
  if (!summary) return <p className="tl__msg">กำลังโหลด...</p>

  const mini = [
    ['รออนุมัติ', summary.pending],
    ['ลาวันนี้', summary.today],
    ['ลาช่วงเดียวกัน', summary.overlap],
    ['กระทบงาน', summary.impact],
  ]

  return (
    <div className="tl">
      <div className="tl__head">
        <button onClick={() => navigate('/team')} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>ภาพรวมการลา</h1>
      </div>

      <div className="tl__types">
        {summary.entitlements.map((e) => (
          <div key={e.name} className="tl__type">
            <span>{e.name}</span>
            <strong>{e.value}</strong>
            <small>{e.unit}</small>
          </div>
        ))}
      </div>

      <div className="tl__grid">
        <section className="tl__panel">
          <h2>คำขอลาและการอนุมัติ</h2>

          <div className="tl__mini">
            {mini.map(([label, n]) => (
              <div key={label}><span>{label}</span><strong>{n}</strong></div>
            ))}
          </div>

          <div className="tl__list">
            <h3>รายการการลา</h3>
            {actError && <p className="tl__err">{actError}</p>}
            <div className="tl__scroll">
              <div className="tl__row tl__row--head">
                <span>ลำดับ</span><span>ชื่อ</span><span>ประเภท</span><span>ระยะเวลา</span><span>สถานะ</span><span />
              </div>
              {leaves.map((l, i) => (
                <div key={l.id} className="tl__row tl__row--item">
                  <span>{i + 1}</span>
                  <span>{l.name}</span>
                  <span><i className="tl__pill">{l.type}</i></span>
                  <span><i className="tl__date"><FiCalendar /> {fmtDate(l.start)} - {fmtDate(l.end)}</i></span>
                  <span><StatusBadge>{STATUS_LABEL[l.status]}</StatusBadge></span>
                  <LeaveActions leave={l} onAsk={ask} />
                </div>
              ))}
              {!leaves.length && <p className="tl__msg">ยังไม่มีรายการลา</p>}
            </div>
          </div>
        </section>

        <aside className="tl__chart">
          <h2><FiCalendar /> สรุปการลา (ตัวอย่าง) <em>ข้อมูลตัวอย่าง</em></h2>
          <div className="tl__plot">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.chart} margin={{ top: 22, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 15]} />
                <Bar dataKey="value" barSize={32} radius={[3, 3, 0, 0]}>
                  {summary.chart.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#1e1578' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="tl__scale"><span>0 วัน</span><span>15 วัน</span></div>
        </aside>
      </div>

      {modal}
    </div>
  )
}
