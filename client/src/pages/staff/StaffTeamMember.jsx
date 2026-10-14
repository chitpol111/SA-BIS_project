import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiChevronLeft, FiUser, FiMoreVertical, FiMessageCircle, FiSend, FiImage, FiLink, FiFileText, FiX, FiList } from 'react-icons/fi'
import { FaWhatsapp, FaFacebook, FaLine } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import { authHeader } from '../../api'
import { getUser } from '../../auth'
import './StaffTeamMember.css'

const MAX = 4 * 1024 * 1024
const OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const timeOf = (iso) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })

// ทำให้ลิงก์ในข้อความกดได้
function Linkified({ text }) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer noopener">{part}</a>
      : part
  )
}

export default function StaffTeamMember() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = getUser()?.memberId
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [sel, setSel] = useState(null)

  const [msgs, setMsgs] = useState([])
  const [chatError, setChatError] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState('')
  const [noteState, setNoteState] = useState('')
  const imgRef = useRef(null)
  const fileRef = useRef(null)
  const endRef = useRef(null)
  const lastId = useRef(0)

  useEffect(() => {
    fetch(`/api/teams/${id}`, { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('โหลดข้อมูลไม่สำเร็จ'))))
      .then((d) => {
        setData(d)
        setSel(d.members.find((m) => m.id !== me)?.id ?? null)
      })
      .catch((e) => setError(e.message))
  }, [id, me])

  const loadChat = useCallback(async (initial) => {
    if (!sel) return
    try {
      const r = await fetch(`/api/chat/${sel}`, { headers: authHeader() })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'โหลดแชทไม่สำเร็จ')
      setChatError('')
      setMsgs(d.messages)
      if (initial) setNote(d.note)
    } catch (e) {
      setChatError(e.message)
      setMsgs([])
    }
  }, [sel])

  useEffect(() => {
    setMsgs([]); setNote(''); setText(''); setFile(null); setNoteState(''); lastId.current = 0
    loadChat(true)
    const t = setInterval(() => loadChat(false), 4000)
    return () => clearInterval(t)
  }, [loadChat])

  useEffect(() => {
    const last = msgs[msgs.length - 1]?.id ?? 0
    if (last !== lastId.current) {
      lastId.current = last
      endRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [msgs])

  function pick(f) {
    setChatError('')
    if (!f) return
    if (!OK.includes(f.type)) return setChatError('รองรับเฉพาะ JPG, PNG, WebP, PDF')
    if (f.size > MAX) return setChatError('ไฟล์ใหญ่เกิน 4MB')
    setFile(f)
  }

  async function send(e) {
    e.preventDefault()
    if (sending || (!text.trim() && !file)) return
    setSending(true); setChatError('')
    try {
      const fd = new FormData()
      fd.append('text', text)
      if (file) fd.append('file', file)
      const r = await fetch(`/api/chat/${sel}`, { method: 'POST', headers: authHeader(), body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'ส่งไม่สำเร็จ')
      setMsgs((l) => [...l, d])
      setText(''); setFile(null)
    } catch (err) {
      setChatError(err.message)
    } finally {
      setSending(false)
      if (imgRef.current) imgRef.current.value = ''
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function saveNote() {
    setNoteState('กำลังบันทึก...')
    const r = await fetch(`/api/chat/${sel}/note`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ note }),
    })
    setNoteState(r.ok ? 'บันทึกแล้ว' : 'บันทึกไม่สำเร็จ')
  }

  if (error) return <p className="stm__msg">{error}</p>
  if (!data) return <p className="stm__msg">กำลังโหลด...</p>

  const { team, members } = data
  const others = members.filter((m) => m.id !== me)
  const other = others.find((m) => m.id === sel)
  const byId = (mid) => members.find((m) => m.id === mid)

  return (
    <div className="stm">
      <div className="stm__head">
        <button onClick={() => navigate('/team')} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>{team.name}</h1>
      </div>

      <div className="stm__panel">
        <div className="stm__cards">
          {others.map((m) => {
            const on = m.id === sel
            return (
              <div key={m.id} className={'pc' + (on ? ' is-on' : '')} onClick={() => setSel(m.id)}>
                <div className="pc__top"><span><i /> กำลังปฏิบัติงาน</span><FiMoreVertical /></div>
                <div className="pc__photo"><FiUser /></div>
                <b>{m.name}</b>
                <span className="pc__pos">{m.position}</span>
                <small>แผนก {m.dept}</small>
                {on ? (
                  <div className="pc__contacts">
                    <a href={`https://wa.me/66${m.contacts.phone.slice(1)}`} target="_blank" rel="noreferrer" style={{ color: '#25d366' }}><FaWhatsapp /></a>
                    <a href={`mailto:${m.contacts.email}`} style={{ color: '#ea4335' }}><SiGmail /></a>
                    <a href={m.contacts.facebook || undefined} target="_blank" rel="noreferrer" className={m.contacts.facebook ? '' : 'is-off'} style={{ color: '#1877f2' }}><FaFacebook /></a>
                    <a href={m.contacts.line || undefined} target="_blank" rel="noreferrer" className={m.contacts.line ? '' : 'is-off'} style={{ color: '#06c755' }}><FaLine /></a>
                  </div>
                ) : (
                  <button type="button" className="pc__chat"><FiMessageCircle /> ติดต่อส่วนตัว</button>
                )}
              </div>
            )
          })}
          {!others.length && <p className="stm__msg">ยังไม่มีสมาชิกคนอื่นในทีมนี้</p>}
        </div>

        {other && (
          <div className="stm__body">
            <section className="chat">
              <div className="chat__list">
                {msgs.map((m) => {
                  const mine = m.from === me
                  const who = byId(m.from)
                  return (
                    <div key={m.id} className={'msg' + (mine ? ' is-mine' : '')} title={`${who?.name ?? ''} ${timeOf(m.createdAt)}`}>
                      <span className="msg__ava"><FiUser /></span>
                      <div className="msg__col">
                        {m.text && <p className="msg__bubble"><Linkified text={m.text} /></p>}
                        {m.file && (m.file.type.startsWith('image/')
                          ? <a href={m.file.url} target="_blank" rel="noreferrer"><img className="msg__img" src={m.file.url} alt={m.file.name} /></a>
                          : <a className="msg__file" href={m.file.url} target="_blank" rel="noreferrer"><FiFileText /><span>{m.file.name}</span></a>)}
                        <small>{timeOf(m.createdAt)}</small>
                      </div>
                    </div>
                  )
                })}
                {!msgs.length && !chatError && <p className="chat__empty">ยังไม่มีข้อความ เริ่มทักทาย {other.name} ได้เลย</p>}
                <div ref={endRef} />
              </div>

              {chatError && <p className="chat__err">{chatError}</p>}
              {file && (
                <div className="chat__pending"><FiFileText /> <span>{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} aria-label="เอาไฟล์ออก"><FiX /></button></div>
              )}

              <form className="chat__form" onSubmit={send}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter Message" maxLength={2000} />
                <input ref={imgRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0])} />
                <input ref={fileRef} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0])} />
                <button type="button" onClick={() => imgRef.current?.click()} aria-label="แนบรูป"><FiImage /></button>
                <button type="button" onClick={() => fileRef.current?.click()} aria-label="แนบไฟล์"><FiLink /></button>
                <button type="submit" className="chat__send" disabled={sending} aria-label="ส่ง"><FiSend /></button>
              </form>
            </section>

            <aside className="note">
              <h3><FiList /> Note</h3>
              <textarea value={note} placeholder=". . . enter your note" maxLength={2000}
                onChange={(e) => { setNote(e.target.value); setNoteState('') }} onBlur={saveNote} />
              <small>{noteState || 'เห็นเฉพาะคุณ'}</small>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
