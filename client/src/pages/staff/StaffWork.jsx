import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import JobCard from '../../components/JobCard'
import { authHeader } from '../../api'
import './StaffWork.css'

export default function StaffWork() {
  const location = useLocation()
  const [mine, setMine] = useState([])
  const [subs, setSubs] = useState([])
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  // ส่วนงานของฉัน: all | done (เริ่มที่ "เสร็จแล้ว" ถ้ามาจากการบันทึกงานเสร็จ)
  const [tabMine, setTabMine] = useState(location.state?.tab === 'done' ? 'done' : 'all')
  // ส่วนรับผิดชอบแทน: all | newest
  const [tabSub, setTabSub] = useState('all')

  const load = useCallback(async () => {
    try {
      const h = { headers: authHeader() }
      const [a, b] = await Promise.all([fetch('/api/my/jobs', h), fetch('/api/my/substitute', h)])
      if (!a.ok || !b.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setMine((await a.json()).jobs)
      setSubs(await b.json())
    } catch (e) {
      setError(e.message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function setProgress(job, progress) {
    setError('')
    const res = await fetch(`/api/my/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ progress }),
    })
    if (!res.ok) setError((await res.json()).error || 'บันทึกไม่สำเร็จ')
    load()
  }

  const kw = q.trim().toLowerCase()
  const match = (j) =>
    !kw || `${j.title} ${j.address} ${j.priority} ${j.substituteFor || ''}`.toLowerCase().includes(kw)

  const mineRows = useMemo(
    () => mine.filter(match).filter((j) => tabMine === 'all' || j.progress === 'done'),
    [mine, kw, tabMine] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const subRows = useMemo(() => {
    const list = subs.filter(match)
    return tabSub === 'newest' ? [...list].sort((a, b) => b.start.localeCompare(a.start)) : list
  }, [subs, kw, tabSub]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="sw">
      {error && <p className="sw__err">{error}</p>}

      <div className="sw__head">
        <h1>งานของฉัน</h1>
        <label className="sw__search">
          <FiSearch />
          <input placeholder="ค้นหารายการอื่น ..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="sw__tabs">
        <button className={tabMine === 'all' ? 'is-on' : ''} onClick={() => setTabMine('all')}>ทั้งหมด</button>
        <button className={tabMine === 'done' ? 'is-on' : ''} onClick={() => setTabMine('done')}>เสร็จแล้ว</button>
      </div>
      <div className="sw__box">
        {mineRows.map((j) => <JobCard key={j.id} job={j} onProgress={setProgress} />)}
        {!mineRows.length && (
          <p className="sw__empty">{tabMine === 'done' ? 'ยังไม่มีงานที่เสร็จ' : 'ยังไม่มีงานที่ได้รับมอบหมาย'}</p>
        )}
      </div>

      <h1 className="sw__h2">รับผิดชอบแทน</h1>
      <div className="sw__tabs">
        <button className={tabSub === 'all' ? 'is-on' : ''} onClick={() => setTabSub('all')}>ทั้งหมด</button>
        <button className={tabSub === 'newest' ? 'is-on' : ''} onClick={() => setTabSub('newest')}>ใหม่-เก่า</button>
      </div>
      <div className="sw__box">
        {subRows.map((j) => <JobCard key={j.id} job={j} onProgress={setProgress} />)}
        {!subRows.length && <p className="sw__empty">ไม่มีงานที่ต้องรับผิดชอบแทน</p>}
      </div>
    </div>
  )
}
