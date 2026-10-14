import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiChevronLeft, FiHome, FiCalendar, FiUploadCloud, FiX, FiFileText, FiChevronDown } from 'react-icons/fi'
import { FaMapMarkerAlt } from 'react-icons/fa'
import ConfirmModal from '../../components/ConfirmModal'
import { authHeader } from '../../api'
import { fmtDate } from '../../date'
import { PROGRESS_LABEL } from '../../components/JobCard'
import './StaffWorkDetail.css'

const MAX = 4 * 1024 * 1024
const OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export default function StaffWorkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [job, setJob] = useState(null)
  const [progress, setProgress] = useState('notstarted')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState([]) // ไฟล์ที่เลือกแล้วแต่ยังไม่บันทึก
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/my/jobs/${id}`, { headers: authHeader() })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || 'โหลดข้อมูลไม่สำเร็จ')
        const j = await r.json()
        setJob(j); setProgress(j.progress); setNote(j.staffNote)
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (!job) return <p style={{ padding: '2rem' }}>{error || 'กำลังโหลด...'}</p>

  function pick(list) {
    setError('')
    const next = [...files]
    for (const f of Array.from(list)) {
      if (!OK.includes(f.type)) return setError('รองรับเฉพาะ JPG, PNG, WebP, PDF')
      if (f.size > MAX) return setError(`ไฟล์ ${f.name} ใหญ่เกิน 4MB`)
      next.push(f)
    }
    if (next.length > 5) return setError('แนบได้ครั้งละไม่เกิน 5 ไฟล์')
    if (next.reduce((total, file) => total + file.size, 0) > MAX) {
      return setError('ขนาดไฟล์รวมต้องไม่เกิน 4MB')
    }
    setFiles(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function removeSaved(u) {
    const res = await fetch(`/api/my/jobs/${id}/updates/${encodeURIComponent(u.path.split('/').pop())}`, {
      method: 'DELETE', headers: authHeader(),
    })
    if (res.ok) setJob(await res.json())
    else setError((await res.json()).error || 'ลบไม่สำเร็จ')
  }

  function askSave() {
    setError('')
    if (progress === 'done' && job.updates.length + files.length === 0) {
      return setError('กรุณาแนบไฟล์อัพเดตงานที่แก้ไขอย่างน้อย 1 ไฟล์ ก่อนเลือกสถานะเสร็จสมบูรณ์')
    }
    setConfirm(true)
  }

  async function save() {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/my/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ progress, staffNote: note }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'บันทึกไม่สำเร็จ')

      if (files.length) {
        const fd = new FormData()
        files.forEach((f) => fd.append('files', f))
        const up = await fetch(`/api/my/jobs/${id}/updates`, { method: 'POST', headers: authHeader(), body: fd })
        if (!up.ok) throw new Error((await up.json()).error || 'อัปโหลดไฟล์ไม่สำเร็จ')
      }
      navigate('/work', { state: { tab: progress === 'done' ? 'done' : 'all' } })
    } catch (e) {
      setError(e.message)
      setConfirm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="swd">
      <div className="swd__head">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>รายละเอียด</h1>
        <button className="swd__home" onClick={() => navigate('/')} aria-label="หน้าแรก"><FiHome /></button>
      </div>

      <div className="swd__card">
        <div className="swd__left">
          <div className="swd__row swd__row--photo">
            <label>รูปปัญหาที่ต้องแก้ไข</label>
            {job.photo
              ? <img src={job.photo} alt={`รูปปัญหาที่ต้องแก้ไข: ${job.type}`} />
              : <div className="swd__nophoto">ไม่มีรูปประกอบ</div>}
          </div>

          <div className="swd__row">
            <label>ประเภทงาน</label>
            <span className="swd__field">{job.title}</span>
            <span className={'swd__prio ' + (job.priority === 'ด่วนมาก' ? 'is-high' : 'is-normal')}>{job.priority}</span>
          </div>

          <div className="swd__row swd__row--top">
            <label>สถานที่</label>
            <div className="swd__addr">
              <span className="swd__field">{job.address}</span>
              <a className="swd__map" target="_blank" rel="noreferrer"
                href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(job.address)}>
                <FaMapMarkerAlt /> Open Google Map
              </a>
            </div>
          </div>

          <div className="swd__row">
            <label>ระยะเวลา</label>
            <span className="swd__date"><FiCalendar /> {fmtDate(job.start)} - {fmtDate(job.end)}</span>
          </div>

          <div className="swd__row">
            <label>สถานะ</label>
            <span className={'swd__status st--' + progress}>
              <select value={progress} onChange={(e) => setProgress(e.target.value)}>
                {Object.entries(PROGRESS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <FiChevronDown />
            </span>
          </div>

          <div className="swd__row">
            <label>หมายเหตุ</label>
            <input className="swd__note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <div className="swd__right">
          <h3>อัพเดตงานที่แก้ไข</h3>
          <div className={'swd__drop' + (dragging ? ' is-drag' : '')}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files) }}>
            <input ref={inputRef} type="file" multiple hidden accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => pick(e.target.files)} />
            <button type="button" className="swd__upload" onClick={() => inputRef.current?.click()}>
              <FiUploadCloud /> upload files
            </button>
            <small>หรือลากไฟล์มาวาง · JPG, PNG, WebP, PDF รวมไม่เกิน 4MB</small>

            <ul>
              {job.updates.map((u) => (
                <li key={u.url}>
                  {u.type.startsWith('image/') ? <img src={u.url} alt="" /> : <FiFileText />}
                  <a href={u.url} target="_blank" rel="noreferrer">{u.name}</a>
                  <button type="button" onClick={() => removeSaved(u)} aria-label="ลบไฟล์"><FiX /></button>
                </li>
              ))}
              {files.map((f, i) => (
                <li key={f.name + i} className="is-new">
                  <FiFileText />
                  <span>{f.name}</span>
                  <button type="button" onClick={() => setFiles(files.filter((_, k) => k !== i))} aria-label="เอาออก"><FiX /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {error && <p className="swd__err">{error}</p>}

      <div className="swd__btns">
        <button className="swd__cancel" onClick={() => navigate(-1)} disabled={saving}>ยกเลิก</button>
        <button className="swd__save" onClick={askSave} disabled={saving}>บันทึก</button>
      </div>

      {confirm && <ConfirmModal loading={saving} onCancel={() => setConfirm(false)} onConfirm={save} />}
    </div>
  )
}
