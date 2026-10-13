import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiArrowLeftCircle, FiPlus } from 'react-icons/fi'
import TeamFolder from '../components/TeamFolder'
import { authHeader } from '../api'
import { PALETTE } from '../teamColors'
import './TeamAll.css'

export default function TeamAll() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetch('/api/teams', { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('โหลดข้อมูลไม่สำเร็จ'))))
      .then(setTeams)
      .catch((e) => setError(e.message))
  }, [])

  function close() {
    setOpen(false); setName(''); setColor(PALETTE[0]); setFormError('')
  }

  async function createTeam(e) {
    e.preventDefault()
    setSaving(true); setFormError('')
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name, ...color }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เพิ่มทีมไม่สำเร็จ')
      setTeams((t) => [...t, data])
      close()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ta">
      <div className="ta__head">
        <button className="ta__back" onClick={() => navigate('/team')} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>All Team</h1>
        <Link to="/team" className="ta__backlink">Back <FiArrowLeftCircle /></Link>
      </div>

      {error && <p className="ta__msg">{error}</p>}

      <div className="ta__grid">
        {teams.map((t) => <TeamFolder key={t.id} team={t} />)}
        <button className="ta__add" onClick={() => setOpen(true)}>
          <FiPlus />
          <span>เพิ่มทีมใหม่</span>
        </button>
      </div>

      {open && (
        <div className="tm" onClick={close}>
          <form className="tm__box" onClick={(e) => e.stopPropagation()} onSubmit={createTeam}>
            <h3>เพิ่มทีมใหม่</h3>
            <label>
              ชื่อทีม
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ทีมไฟฟ้าแรงสูง" maxLength={40} required />
            </label>
            <div className="tm__colors">
              <span>สีโฟลเดอร์</span>
              <div>
                {PALETTE.map((c) => (
                  <button type="button" key={c.front} aria-label={c.front}
                    className={color.front === c.front ? 'is-on' : ''}
                    style={{ background: c.front, boxShadow: `inset -8px 0 0 ${c.back}` }}
                    onClick={() => setColor(c)} />
                ))}
              </div>
            </div>
            {formError && <p className="tm__error">{formError}</p>}
            <div className="tm__btns">
              <button type="button" onClick={close} disabled={saving}>ยกเลิก</button>
              <button type="submit" className="tm__ok" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'เพิ่มทีม'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
