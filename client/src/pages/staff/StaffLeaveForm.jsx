import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiHome, FiCalendar, FiChevronDown, FiPaperclip, FiEye, FiTrash2, FiPlus } from 'react-icons/fi'
import ConfirmModal from '../../components/ConfirmModal'
import { authHeader } from '../../api'
import { todayISO, addDays, fmtDate } from '../../date'
import { DURATION_LABEL, LEAVE_TYPES } from '../../leaveLabels'
import { openAttachment } from '../../openAttachment'
import './StaffLeave.css'

const MAX_FILES = 3
const MAX_MB = 4
const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

const fmtSize = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const fmtUp = (iso) => (iso ? fmtDate(new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })) : '-')

export default function StaffLeaveForm() {
  const navigate = useNavigate()
  const editing = useLocation().state?.leave // มีค่า = โหมดแก้ไข
  const [form, setForm] = useState(() =>
    editing
      ? { type: editing.type, duration: editing.duration || 'full', start: editing.start, end: editing.end,
          substituteId: String(editing.substituteId), note: editing.note || '', attachments: editing.attachments || [] }
      : { type: 'ลาป่วย', duration: 'full', start: todayISO(), end: addDays(todayISO(), 1), substituteId: '', note: '', attachments: [] }
  )
  const [colleagues, setColleagues] = useState([])
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [docErr, setDocErr] = useState('')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch('/api/leaves/colleagues', { headers: authHeader() })
      .then((r) => r.json())
      .then((list) => {
        setColleagues(list)
        setForm((f) => (f.substituteId || !list.length ? f : { ...f, substituteId: String(list[0].id) }))
      })
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const dropOnServer = (a) =>
    fetch(`/api/leaves/attachment?path=${encodeURIComponent(a.path)}`, { method: 'DELETE', headers: authHeader() }).catch(() => {})

  async function addFiles(fileList) {
    const files = Array.from(fileList || [])
    if (inputRef.current) inputRef.current.value = ''
    if (!files.length) return
    setDocErr('')
    if (files.length > MAX_FILES - form.attachments.length) return setDocErr(`แนบเอกสารได้ไม่เกิน ${MAX_FILES} ไฟล์`)
    for (const f of files) {
      if (!OK_TYPES.includes(f.type)) return setDocErr('รองรับเฉพาะ PDF, JPG, PNG, WebP')
      if (f.size > MAX_MB * 1024 * 1024) return setDocErr(`ไฟล์ใหญ่เกิน ${MAX_MB}MB`)
    }
    setUploading(true)
    const added = []
    try {
      for (const f of files) {
        const fd = new FormData()
        fd.append('file', f)
        const res = await fetch('/api/leaves/attachment', { method: 'POST', headers: authHeader(), body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'อัปโหลดไฟล์ไม่สำเร็จ')
        added.push({ ...data, fresh: true })
      }
    } catch (e) {
      setDocErr(e.message)
    } finally {
      setUploading(false)
    }
    if (added.length) setForm((cur) => ({ ...cur, attachments: [...cur.attachments, ...added] }))
  }

  function removeDoc(a) {
    setForm((cur) => ({ ...cur, attachments: cur.attachments.filter((x) => x.path !== a.path) }))
    if (a.fresh) dropOnServer(a) // ไฟล์ที่เพิ่งอัปโหลดและยังไม่ถูกบันทึกกับใบลา ลบทิ้งได้เลย
  }

  function cancel() {
    form.attachments.filter((a) => a.fresh).forEach(dropOnServer)
    navigate('/team')
  }

  function ask(e) {
    e.preventDefault()
    setError('')
    if (uploading) return setError('กำลังอัปโหลดไฟล์ กรุณารอสักครู่')
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

        <div className="lf__docs">
          <span className="lf__doclabel">เอกสารแนบ</span>
          <div className="lf__docbox">
            {form.attachments.map((a) => (
              <div key={a.path} className="lf__file">
                <span className="lf__fileico"><FiPaperclip /></span>
                <div className="lf__fileinfo">
                  <strong>{a.name}</strong>
                  <small>{fmtSize(a.size)} • อัปโหลดเมื่อ {fmtUp(a.uploadedAt)}</small>
                </div>
                <button type="button" onClick={() => openAttachment(a.path)}><FiEye /> ดู</button>
                <button type="button" onClick={() => removeDoc(a)}><FiTrash2 /> ลบ</button>
              </div>
            ))}

            {form.attachments.length < MAX_FILES && (
              <button
                type="button"
                className={'lf__drop' + (drag ? ' is-drag' : '')}
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
              >
                <FiPlus /> {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์หรือลากวางเอกสารเพื่อแนบ'}
              </button>
            )}
            <input ref={inputRef} type="file" hidden multiple accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => addFiles(e.target.files)} />
          </div>
          <small className="lf__hint">PDF, JPG, PNG, WebP ไม่เกิน {MAX_MB}MB ต่อไฟล์ แนบได้สูงสุด {MAX_FILES} ไฟล์</small>
          {docErr && <p className="lf__err">{docErr}</p>}
        </div>

        {error && <p className="lf__err">{error}</p>}

        <div className="lf__btns">
          <button type="button" className="lf__cancel" onClick={cancel}>ยกเลิก</button>
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
