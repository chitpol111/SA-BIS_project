import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiHome, FiCalendar, FiChevronDown } from 'react-icons/fi'
import ConfirmModal from '../../components/ConfirmModal'
import { authHeader } from '../../api'
import { todayISO, addDays } from '../../date'
import { DURATION_LABEL, LEAVE_TYPES } from '../../leaveLabels'
import './StaffLeave.css'

export default function StaffLeaveForm() {
  const navigate = useNavigate()
  const editing = useLocation().state?.leave // มีค่า = โหมดแก้ไข
  const [form, setForm] = useState(() =>
    editing
      ? { type: editing.type, duration: editing.duration || 'full', start: editing.start, end: editing.end,
          substituteId: String(editing.substituteId), note: editing.note || '' }
      : { type: 'ลาป่วย', duration: 'full', start: todayISO(), end: addDays(todayISO(), 1), substituteId: '', note: '' }
  )
  const [colleagues, setColleagues] = useState([])
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/leaves/colleagues', { headers: authHeader() })
      .then((r) => r.json())
      .then((list) => {
        setColleagues(list)
        setForm((f) => (f.substituteId || !list.length ? f : { ...f, substituteId: String(list[0].id) }))
      })
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function ask(e) {
    e.preventDefault()
    setError('')
    if (!form.substituteId) return setError('กรุณาเลือกพนักงานรับผิดชอบแทน')
    if (form.duration === 'multi' && form.end <= form.start) return setError('วันสิ้นสุดต้องหลังวันเริ่มต้น')
    setConfirm(true)
  }

  async function send() {
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/leaves/${editing.id}` : '/api/leaves', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ส่งใบลาไม่สำเร็จ')
      navigate('/team/leave/mine', { state: { justSent: true }, replace: true })
    } catch (err) {
      setError(err.message)
      setConfirm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="lf">
      <div className="lf__head">
        <button onClick={() => navigate('/team')} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>{editing ? 'แก้ไขใบลา' : 'ยื่นใบลา'}</h1>
        <button className="lf__home" onClick={() => navigate('/')} aria-label="หน้าแรก"><FiHome /></button>
      </div>

      <form className="lf__card" onSubmit={ask}>
        <h2>แบบฟอร์มการยื่นลา</h2>
        <p className="lf__sub">กรุณากรอกข้อมูลการลาและกำหนดพนักงานรับผิดชอบแทน</p>

        <div className="lf__grid">
          <label>ประเภทการลา
            <span className="lf__select">
              <select value={form.type} onChange={set('type')}>
                {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <FiChevronDown />
            </span>
          </label>
          <label>วันที่ลา
            <span className="lf__input">
              <FiCalendar />
              <input type="date" value={form.start} onChange={set('start')} required />
            </span>
          </label>
        </div>

        <label>ระยะเวลาการลา
          <span className="lf__select">
            <select value={form.duration} onChange={set('duration')}>
              {Object.entries(DURATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <FiChevronDown />
          </span>
        </label>

        {form.duration === 'multi' && (
          <label>ถึงวันที่
            <span className="lf__input lf__input--half">
              <FiCalendar />
              <input type="date" value={form.end} min={addDays(form.start, 1)} onChange={set('end')} required />
            </span>
          </label>
        )}

        <label>พนักงานรับผิดชอบแทน
          <span className="lf__select lf__select--half">
            <select value={form.substituteId} onChange={set('substituteId')} required>
              {!colleagues.length && <option value="">ไม่พบเพื่อนร่วมทีม</option>}
              {colleagues.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FiChevronDown />
          </span>
        </label>

        <label>รายละเอียดส่งมอบงาน
          <textarea rows="5" value={form.note} onChange={set('note')} maxLength={1000}
            placeholder="กรอกรายละเอียดงานที่ต้องส่งมอบและขั้นตอนการดำเนินการต่อ..." />
        </label>

        {error && <p className="lf__err">{error}</p>}

        <div className="lf__btns">
          <button type="button" className="lf__cancel" onClick={() => navigate('/team')}>ยกเลิก</button>
          <button type="submit" className="lf__ok">ส่งใบลา</button>
        </div>
      </form>

      {confirm && (
        <ConfirmModal title="ยืนยันการส่งหรือไม่" confirmText="ยืนยันการส่ง" loading={saving}
          onCancel={() => setConfirm(false)} onConfirm={send} />
      )}
    </div>
  )
}
