import { Router } from 'express'
import { requireAuth } from './auth.js'
import { works, staff } from './work.js'

const router = Router()
const HEX = /^#[0-9a-fA-F]{6}$/
const ISO = /^\d{4}-\d{2}-\d{2}$/
const TYPE_COLOR = { 'ไฟฟ้า': '#143f77', 'โยธา': '#e2cc7a', 'คนสวน': '#10b981' }

let eventId = 1
let todoId = 6

const customEvents = [
  { id: eventId++, title: 'ประชุมประจำเดือน', start: '2026-10-14', end: '2026-10-14', color: '#0b98e0', note: 'ห้องประชุมกองช่าง' },
]

const todos = [
  { id: 1, text: 'เซ็นเอกสารอนุมัติการลา', done: true },
  { id: 2, text: 'อนุมัติงบประมาณ', done: false },
  { id: 3, text: 'ติดตามสถานะงาน', done: false },
  { id: 4, text: 'ตรวจสอบอัตรากำลังเพื่อขอรับสมัครคนเพิ่ม', done: false },
  { id: 5, text: 'ติดตามผลการดำเนินงานที่ล่าช้า', done: true },
  { id: 6, text: 'มอบหมายงานใหม่', done: true },
]

function workEvents() {
  return works.map((w) => {
    const names = (w.officers ?? []).map((id) => staff.find((s) => s.id === id)?.name).filter(Boolean)
    return {
      id: w.id, kind: 'work', title: w.title, start: w.start, end: w.end,
      color: TYPE_COLOR[w.type] || '#64748b',
      subtitle: names.length ? names.join(', ') : 'ยังไม่มอบหมาย',
    }
  })
}

router.get('/events', requireAuth, (_req, res) =>
  res.json([...workEvents(), ...customEvents.map((e) => ({ ...e, kind: 'custom' }))])
)

router.post('/events', requireAuth, (req, res) => {
  const b = req.body ?? {}
  const title = String(b.title ?? '').trim().slice(0, 100)
  if (!title) return res.status(400).json({ error: 'กรุณากรอกชื่อกิจกรรม' })
  if (!ISO.test(b.start) || !ISO.test(b.end) || b.end < b.start) {
    return res.status(400).json({ error: 'ระยะเวลาไม่ถูกต้อง' })
  }
  if (!HEX.test(b.color)) return res.status(400).json({ error: 'สีไม่ถูกต้อง' })
  const ev = {
    id: eventId++, title, start: b.start, end: b.end, color: b.color,
    note: String(b.note ?? '').slice(0, 500),
  }
  customEvents.push(ev)
  res.status(201).json({ ...ev, kind: 'custom' })
})

router.delete('/events/:id', requireAuth, (req, res) => {
  const i = customEvents.findIndex((e) => e.id === Number(req.params.id))
  if (i === -1) return res.status(404).json({ error: 'ไม่พบกิจกรรม' })
  customEvents.splice(i, 1)
  res.json({ ok: true })
})

// ---------- รายการสิ่งที่ต้องทำ ----------
router.get('/todos', requireAuth, (_req, res) => res.json(todos))

router.post('/todos', requireAuth, (req, res) => {
  const text = String(req.body?.text ?? '').trim().slice(0, 150)
  if (!text) return res.status(400).json({ error: 'กรุณากรอกข้อความ' })
  const t = { id: ++todoId, text, done: false }
  todos.push(t)
  res.status(201).json(t)
})

router.patch('/todos/:id', requireAuth, (req, res) => {
  const t = todos.find((x) => x.id === Number(req.params.id))
  if (!t) return res.status(404).json({ error: 'ไม่พบรายการ' })
  t.done = Boolean(req.body?.done)
  res.json(t)
})

router.delete('/todos/:id', requireAuth, (req, res) => {
  const i = todos.findIndex((x) => x.id === Number(req.params.id))
  if (i === -1) return res.status(404).json({ error: 'ไม่พบรายการ' })
  todos.splice(i, 1)
  res.json({ ok: true })
})

export default router
