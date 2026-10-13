import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiChevronLeft, FiSearch, FiArrowLeftCircle, FiArrowRightCircle,
  FiPlus, FiCheck, FiChevronDown, FiChevronUp, FiX, FiDownload,
} from 'react-icons/fi'
import ConfirmModal from '../components/ConfirmModal'
import { authHeader } from '../api'
import {
  MONTH_FULL, addDays, daysBetween, fmtDate, monthGrid, todayISO, weekdayIndex,
} from '../date'
import './Calendar.css'

const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const COLORS = ['#143f77', '#0b98e0', '#e2cc7a', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#64748b']
const json = { 'Content-Type': 'application/json' }

function ink(hex) {
  const n = parseInt(hex.slice(1), 16)
  const lum = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000
  return lum > 150 ? '#222' : '#fff'
}

// ลิงก์สร้างนัดใน Google Calendar
function googleUrl(e) {
  const d = (iso) => iso.replaceAll('-', '')
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${d(e.start)}/${d(addDays(e.end, 1))}`,
    details: e.subtitle || e.note || '',
  })
  return 'https://calendar.google.com/calendar/render?' + p
}

// ดาวน์โหลดไฟล์ .ics (นำเข้า Google/Apple/Outlook ได้)
function exportIcs(events) {
  const d = (iso) => iso.replaceAll('-', '')
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//manpower-ma//TH', 'CALSCALE:GREGORIAN']
  events.forEach((e) =>
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.kind}-${e.id}@manpower-ma`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d(e.start)}`,
      `DTEND;VALUE=DATE:${d(addDays(e.end, 1))}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.subtitle || e.note || '')}`,
      'END:VEVENT'
    )
  )
  lines.push('END:VCALENDAR')
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'calendar.ics' })
  a.click()
  URL.revokeObjectURL(url)
}

export default function Calendar() {
  const navigate = useNavigate()
  const today = todayISO()
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState({ y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 })
  const [events, setEvents] = useState([])
  const [todos, setTodos] = useState([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  const [detail, setDetail] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [showAll, setShowAll] = useState(false)
  const [newTodo, setNewTodo] = useState(null) // null = ซ่อนช่องกรอก

  const load = useCallback(async () => {
    try {
      const h = { headers: authHeader() }
      const [e, t] = await Promise.all([fetch('/api/calendar/events', h), fetch('/api/calendar/todos', h)])
      if (!e.ok || !t.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setEvents(await e.json())
      setTodos(await t.json())
    } catch (err) {
      setError(err.message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  // เลื่อนสัปดาห์แล้วให้ปฏิทินเล็กตามไปเดือนเดียวกัน
  useEffect(() => {
    setCursor({ y: +selected.slice(0, 4), m: +selected.slice(5, 7) - 1 })
  }, [selected])

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return events.filter((e) => !kw || `${e.title} ${e.subtitle ?? ''} ${e.note ?? ''}`.toLowerCase().includes(kw))
  }, [events, q])

  // ---------- มุมมองสัปดาห์ (7 วัน โดยวันที่เลือกอยู่ตรงกลาง) ----------
  const days = Array.from({ length: 7 }, (_, i) => addDays(selected, i - 3))
  const placed = useMemo(() => {
    const ws = days[0], we = days[6]
    const lanes = []
    return shown
      .filter((e) => e.start <= we && e.end >= ws)
      .sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
      .map((e) => {
        const s = e.start < ws ? ws : e.start
        const en = e.end > we ? we : e.end
        let lane = lanes.findIndex((last) => last < s)
        if (lane === -1) { lane = lanes.length; lanes.push(en) } else lanes[lane] = en
        return { ...e, lane, col: daysBetween(ws, s) + 1, span: daysBetween(s, en) + 1 }
      })
  }, [shown, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- ปฏิทินเล็ก ----------
  const cells = monthGrid(cursor.y, cursor.m)
  const hasEvent = (iso) => events.some((e) => e.start <= iso && e.end >= iso)
  const moveMonth = (n) => {
    const d = new Date(Date.UTC(cursor.y, cursor.m + n, 1))
    setCursor({ y: d.getUTCFullYear(), m: d.getUTCMonth() })
  }

  // ---------- เพิ่ม/ลบกิจกรรม ----------
  function openAdd() {
    setForm({ title: '', start: selected, end: selected, color: COLORS[1], note: '' })
    setFormError('')
    setAdding(true)
  }
  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function createEvent(e) {
    e.preventDefault()
    if (form.end < form.start) return setFormError('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น')
    setSaving(true); setFormError('')
    try {
      const res = await fetch('/api/calendar/events', { method: 'POST', headers: { ...json, ...authHeader() }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เพิ่มกิจกรรมไม่สำเร็จ')
      setEvents((l) => [...l, data])
      setSelected(form.start)
      setAdding(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent() {
    setSaving(true)
    try {
      const res = await fetch(`/api/calendar/events/${detail.id}`, { method: 'DELETE', headers: authHeader() })
      if (!res.ok) throw new Error((await res.json()).error || 'ลบไม่สำเร็จ')
      setEvents((l) => l.filter((x) => !(x.kind === 'custom' && x.id === detail.id)))
      setDetail(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
      setConfirmDel(false)
    }
  }

  // ---------- รายการสิ่งที่ต้องทำ ----------
  async function toggleTodo(t) {
    setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
    await fetch(`/api/calendar/todos/${t.id}`, { method: 'PATCH', headers: { ...json, ...authHeader() }, body: JSON.stringify({ done: !t.done }) })
  }
  async function addTodo(e) {
    e.preventDefault()
    const text = newTodo.trim()
    if (!text) return setNewTodo(null)
    const res = await fetch('/api/calendar/todos', { method: 'POST', headers: { ...json, ...authHeader() }, body: JSON.stringify({ text }) })
    if (res.ok) {
      const created = await res.json()
      setTodos((l) => [...l, created])
      setNewTodo('')
    }
  }
  async function removeTodo(t) {
    setTodos((l) => l.filter((x) => x.id !== t.id))
    await fetch(`/api/calendar/todos/${t.id}`, { method: 'DELETE', headers: authHeader() })
  }
  const todoList = showAll ? todos : todos.slice(0, 6)

  return (
    <div className="cal">
      <div className="cal__head">
        <button className="cal__back" onClick={() => navigate(-1)} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>ปฏิทินของฉัน</h1>
        <label className="cal__search">
          <FiSearch />
          <input placeholder="ค้นหารายการอื่น ..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {error && <p className="cal__err">{error}</p>}

      <div className="cal__grid">
        <div className="cal__left">
          {/* ปฏิทินเล็ก */}
          <section className="mini">
            <header>
              <strong>{MONTH_FULL[cursor.m]} {cursor.y}</strong>
              <span>
                <button onClick={() => moveMonth(-1)} aria-label="เดือนก่อน"><FiArrowLeftCircle /></button>
                <button onClick={() => moveMonth(1)} aria-label="เดือนถัดไป"><FiArrowRightCircle /></button>
              </span>
            </header>
            <div className="mini__body">
              {DAY_ABBR.map((d) => <b key={d}>{d}</b>)}
              {cells.map((iso, i) =>
                iso ? (
                  <button key={iso} className={'mini__day' + (iso === selected ? ' is-sel' : '') + (iso === today ? ' is-today' : '')}
                    onClick={() => setSelected(iso)}>
                    {+iso.slice(8)}
                    {hasEvent(iso) && <i />}
                  </button>
                ) : <span key={'b' + i} />
              )}
            </div>
          </section>

          {/* My Calendar */}
          <section className="todo">
            <header>
              <h2>My Calendar</h2>
              <button onClick={() => setNewTodo(newTodo === null ? '' : null)}>Add <FiPlus /></button>
            </header>
            <ul>
              {newTodo !== null && (
                <li>
                  <form onSubmit={addTodo}>
                    <input autoFocus value={newTodo} onChange={(e) => setNewTodo(e.target.value)}
                      placeholder="พิมพ์แล้วกด Enter" maxLength={150} />
                  </form>
                </li>
              )}
              {todoList.map((t) => (
                <li key={t.id} className={t.done ? 'is-done' : ''}>
                  <button className="todo__box" onClick={() => toggleTodo(t)} aria-label="ทำเสร็จ">{t.done && <FiCheck />}</button>
                  <span>{t.text}</span>
                  <button className="todo__x" onClick={() => removeTodo(t)} aria-label="ลบ"><FiX /></button>
                </li>
              ))}
              {!todos.length && <li className="todo__empty">ยังไม่มีรายการ</li>}
            </ul>
            {todos.length > 6 && (
              <button className="todo__more" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'See less' : 'See more'} {showAll ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            )}
          </section>
        </div>

        {/* มุมมองสัปดาห์ */}
        <section className="week">
          <header>
            <h2>{MONTH_FULL[+selected.slice(5, 7) - 1]} {+selected.slice(8)} - {selected.slice(0, 4)}</h2>
            <div className="week__nav">
              <button className="week__today" onClick={() => setSelected(today)}>Today</button>
              <button onClick={() => setSelected(addDays(selected, -7))} aria-label="สัปดาห์ก่อน"><FiArrowLeftCircle /></button>
              <button onClick={() => setSelected(addDays(selected, 7))} aria-label="สัปดาห์ถัดไป"><FiArrowRightCircle /></button>
            </div>
          </header>

          <div className="week__body">
            <div className="week__tools">
              <button onClick={openAdd}><FiPlus /> เพิ่มกิจกรรม</button>
              <button onClick={() => exportIcs(events)}><FiDownload /> Export .ics</button>
            </div>

            <div className="week__days">
              {days.map((d) => (
                <button key={d} className={d === selected ? 'is-sel' : ''} onClick={() => setSelected(d)}>
                  <strong>{d.slice(8)}</strong>
                  <small>{DAY_ABBR[weekdayIndex(d)]}</small>
                </button>
              ))}
            </div>

            <div className="week__bars">
              {placed.map((e) => (
                <button key={e.kind + e.id} className="bar"
                  style={{ gridColumn: `${e.col} / span ${e.span}`, gridRow: e.lane + 1, background: e.color, color: ink(e.color) }}
                  onClick={() => setDetail(e)}>
                  <b>{e.title}</b>
                  <small>{e.subtitle || e.note || ''}</small>
                </button>
              ))}
              {!placed.length && <p className="week__empty">ไม่มีกิจกรรมในสัปดาห์นี้</p>}
            </div>
          </div>
        </section>
      </div>

      {/* รายละเอียดกิจกรรม */}
      {detail && (
        <div className="cm" onClick={() => setDetail(null)}>
          <div className="cm__box" onClick={(e) => e.stopPropagation()}>
            <span className="cm__chip" style={{ background: detail.color, color: ink(detail.color) }}>
              {detail.kind === 'work' ? 'งาน' : 'กิจกรรม'}
            </span>
            <h3>{detail.title}</h3>
            <p>{fmtDate(detail.start)}{detail.end !== detail.start && ` - ${fmtDate(detail.end)}`}</p>
            {(detail.subtitle || detail.note) && <p className="cm__note">{detail.subtitle || detail.note}</p>}
            <a className="cm__google" href={googleUrl(detail)} target="_blank" rel="noreferrer">เพิ่มลง Google Calendar</a>
            <div className="cm__btns">
              <button onClick={() => setDetail(null)}>ปิด</button>
              {detail.kind === 'work'
                ? <button className="cm__ok" onClick={() => navigate(`/work/${detail.id}`)}>เปิดรายละเอียดงาน</button>
                : <button className="cm__del" onClick={() => setConfirmDel(true)}>ลบกิจกรรม</button>}
            </div>
          </div>
        </div>
      )}
      {confirmDel && (
        <ConfirmModal title="ยืนยันการลบกิจกรรมหรือไม่" confirmText="ลบ" loading={saving}
          onCancel={() => setConfirmDel(false)} onConfirm={deleteEvent} />
      )}

      {/* เพิ่มกิจกรรม */}
      {adding && (
        <div className="cm" onClick={() => setAdding(false)}>
          <form className="cm__box cm__form" onClick={(e) => e.stopPropagation()} onSubmit={createEvent}>
            <h3>เพิ่มกิจกรรม</h3>
            <label>ชื่อกิจกรรม
              <input autoFocus value={form.title} onChange={setF('title')} maxLength={100} required />
            </label>
            <div className="cm__dates">
              <label>เริ่ม<input type="date" value={form.start} onChange={setF('start')} required /></label>
              <label>สิ้นสุด<input type="date" value={form.end} min={form.start} onChange={setF('end')} required /></label>
            </div>
            <label>รายละเอียด (ถ้ามี)
              <input value={form.note} onChange={setF('note')} maxLength={500} />
            </label>
            <div className="cm__colors">
              {COLORS.map((c) => (
                <button type="button" key={c} aria-label={c} style={{ background: c }}
                  className={form.color === c ? 'is-on' : ''} onClick={() => setForm({ ...form, color: c })} />
              ))}
            </div>
            {formError && <p className="cm__error">{formError}</p>}
            <div className="cm__btns">
              <button type="button" onClick={() => setAdding(false)} disabled={saving}>ยกเลิก</button>
              <button type="submit" className="cm__ok" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'เพิ่มกิจกรรม'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
