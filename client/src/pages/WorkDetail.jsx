import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiChevronLeft, FiHome, FiCalendar, FiPlus, FiUser, FiX, FiMapPin, FiChevronDown } from 'react-icons/fi'
import ConfirmModal from '../components/ConfirmModal'
import PhotoUpload from '../components/PhotoUpload'
import './WorkDetail.css'

const TYPES = ['ไฟฟ้า', 'โยธา', 'คนสวน']
const TEAMS = ['ทีมไฟฟ้า', 'ทีมโยธา', 'ทีมคนสวน']
const PRIORITIES = ['ด่วนมาก', 'ปกติ']

function authHeader() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { Authorization: 'Bearer ' + t }
}

export default function WorkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [staff, setStaff] = useState([])
  const [picker, setPicker] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/work/${id}`, { headers: authHeader() }),
      fetch('/api/work/staff', { headers: authHeader() }),
    ])
      .then(async ([w, s]) => {
        if (!w.ok) throw new Error('ไม่พบงานนี้')
        setForm(await w.json())
        setStaff(await s.json())
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error && !form) return <p style={{ padding: '2rem' }}>{error}</p>
  if (!form) return <p style={{ padding: '2rem' }}>กำลังโหลด...</p>

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const assigned = form.officers.map((oid) => staff.find((s) => s.id === oid)).filter(Boolean)
  const addable = staff.filter((s) => !form.officers.includes(s.id))

  const addOfficer = (sid) => {
    setForm({ ...form, officers: [...form.officers, sid] })
    setPicker(false)
  }
  const removeOfficer = (sid) =>
    setForm({ ...form, officers: form.officers.filter((x) => x !== sid) })

  const mapUrl =
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(form.address || 'ประเทศไทย')

  async function uploadPhoto(file) {
    const fd = new FormData()
    fd.append('photo', file)
    const res = await fetch(`/api/work/${id}/photo`, { method: 'POST', headers: authHeader(), body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'อัปโหลดไม่สำเร็จ')
    setForm((f) => ({ ...f, photo: data.photo }))
  }

  async function removePhoto() {
    await fetch(`/api/work/${id}/photo`, { method: 'DELETE', headers: authHeader() })
    setForm((f) => ({ ...f, photo: '' }))
  }

  // กด "ยืนยัน" -> ตรวจข้อมูลแล้วเปิดป๊อปอัป
  function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) return setError('กรุณากรอกชื่องาน')
    if (form.end < form.start) return setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น')
    setConfirm(true)
  }

  // กด "ยืนยันการบันทึก" ในป๊อปอัป -> เรียก API
  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/work/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ')
      navigate('/work')
    } catch (err) {
      setError(err.message)
      setConfirm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wd">
      <div className="wd__head">
        <button className="wd__back" onClick={() => navigate(-1)} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>รายละเอียดงาน</h1>
        <button className="wd__home" onClick={() => navigate('/')} aria-label="หน้าแรก"><FiHome /></button>
      </div>

      <form className="wd__card" onSubmit={onSubmit}>
        <h2>มอบหมายงาน</h2>

        <div className="wd__grid">
          <div className="wd__fields">
            <div className="wd__line">
              <label className="wd__label">ลำดับที่ {form.id}</label>
              <input className="wd__input wd__input--title" value={form.title} onChange={set('title')} />
              <span className="wd__select wd__select--blue">
                <select value={form.type} onChange={set('type')}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <FiChevronDown />
              </span>
            </div>

            <div className="wd__line wd__line--top">
              <label className="wd__label">รายละเอียด</label>
              <textarea className="wd__input wd__textarea" value={form.description} onChange={set('description')} />
            </div>

            <div className="wd__line">
              <label className="wd__label">สถานที่</label>
              <a className="wd__map" href={mapUrl} target="_blank" rel="noreferrer">
                <FiMapPin /> Open Google Map
              </a>
              <input className="wd__input wd__input--addr" placeholder="ที่อยู่ ...................."
                value={form.address} onChange={set('address')} />
            </div>

            <div className="wd__line">
              <label className="wd__label">ทีมที่รับผิดชอบ</label>
              <span className="wd__select wd__select--blue wd__select--wide">
                <select value={form.team} onChange={set('team')}>
                  {TEAMS.map((t) => <option key={t}>{t}</option>)}
                </select>
                <FiChevronDown />
              </span>
            </div>

            <div className="wd__line">
              <label className="wd__label">ระยะเวลา</label>
              <span className="wd__range">
                <FiCalendar />
                <input type="date" value={form.start} onChange={set('start')} required />
                <span>-</span>
                <input type="date" value={form.end} min={form.start} onChange={set('end')} required />
              </span>
            </div>
          </div>

          <PhotoUpload value={form.photo} onUpload={uploadPhoto} onRemove={removePhoto} />
        </div>

        <div className="wd__officers">
          <label className="wd__label">เจ้าหน้าที่</label>
          <div className="wd__people">
            {assigned.map((s) => (
              <div key={s.id} className="person">
                <FiUser className="person__icon" />
                <span className="person__name">{s.name}</span>
                <i className={'dot ' + (s.available ? 'dot--on' : 'dot--off')} />
                <span>{s.available ? 'ว่าง' : 'ไม่ว่าง'}</span>
                <button type="button" className="person__x" aria-label="เอาออก" onClick={() => removeOfficer(s.id)}>
                  <FiX />
                </button>
              </div>
            ))}
          </div>

          <div className="wd__add">
            <button type="button" className="wd__addbtn" onClick={() => setPicker(!picker)} disabled={!addable.length}>
              <FiPlus /> เจ้าหน้าที่
            </button>
            {picker && (
              <ul className="wd__picker">
                {addable.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => addOfficer(s.id)}>
                      <span>{s.name}</span>
                      <small>{s.team} · {s.available ? 'ว่าง' : 'ไม่ว่าง'}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="wd__line wd__line--prio">
          <label className="wd__label">ความสำคัญ</label>
          <span className={'wd__select wd__select--' + (form.priority === 'ด่วนมาก' ? 'red' : 'green')}>
            <select value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <FiChevronDown />
          </span>
        </div>

        <div className="wd__footer">
          <label className="wd__label">หมายเหตุ</label>
          <input className="wd__input wd__note" value={form.note} onChange={set('note')} />
          <button type="button" className="wd__cancel" onClick={() => navigate('/work')}>ยกเลิก</button>
          <button type="submit" className="wd__ok">ยืนยัน</button>
        </div>

        {error && <p className="wd__error">{error}</p>}
      </form>

      {confirm && (
        <ConfirmModal loading={saving} onCancel={() => setConfirm(false)} onConfirm={save} />
      )}
    </div>
  )
}
