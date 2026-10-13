import { useCallback, useEffect, useState } from 'react'
import JobCard from '../../components/JobCard'
import StatCard from '../../components/StatCard'
import { authHeader } from '../../api'
import { getUser } from '../../auth'
import './StaffHome.css'

export default function StaffHome() {
  const user = getUser()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all') // all | done

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/my/jobs', { headers: authHeader() })
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setData(await res.json())
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

  if (!data) return <p className="sh__msg">{error || 'กำลังโหลด...'}</p>

  const { jobs, stats } = data
  const rows = tab === 'done' ? jobs.filter((j) => j.progress === 'done') : jobs
  const displayName = (user?.name || '').replace(/^(นางสาว|นาย|นาง)/, '')

  return (
    <div className="sh">
      <h1>สวัสดี คุณ {displayName}</h1>

      <div className="sh__stats">
        <StatCard value={stats.total} label="งานทั้งหมด" color="#1a4f9c" />
        <StatCard value={stats.notstarted} label="ยังไม่เริ่ม" color="#ef2b3a" />
        <StatCard value={stats.progress} label="กำลังดำเนินการ" color="#f2c230" />
        <StatCard value={stats.done} label="เสร็จสมบูรณ์" color="#2fc45e" />
        <div className="sh__prog">
          <b>ดำเนินการไปแล้ว</b>
          <small>งานวันนี้</small>
          <div className="sh__bar"><i style={{ width: stats.todayPct + '%', background: '#ec4899' }} /><span>{stats.todayPct}%</span></div>
          <small>งานทั้งหมด</small>
          <div className="sh__bar"><i style={{ width: stats.allPct + '%', background: '#8b5cf6' }} /><span>{stats.allPct}%</span></div>
        </div>
      </div>

      <section className="sh__panel">
        <h2>งานที่ต้องทำวันนี้</h2>
        <div className="sh__tabs">
          <button className={tab === 'all' ? 'is-on' : ''} onClick={() => setTab('all')}>ทั้งหมด</button>
          <button className={tab === 'done' ? 'is-on' : ''} onClick={() => setTab('done')}>เสร็จแล้ว</button>
        </div>

        {error && <p className="sh__err">{error}</p>}

        <div className="sh__list">
          {rows.map((j) => <JobCard key={j.id} job={j} onProgress={setProgress} />)}
          {!rows.length && <p className="sh__msg">{tab === 'done' ? 'ยังไม่มีงานที่เสร็จ' : 'ยังไม่มีงานที่ได้รับมอบหมาย'}</p>}
        </div>
      </section>
    </div>
  )
}
