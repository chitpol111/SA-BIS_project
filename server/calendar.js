import { Router } from 'express'
import { requireAuth } from './auth.js'
import { works, staff } from './work.js'
import { leaves } from './leave.js'
import { registerCollection } from './db.js'

const router = Router()
const HEX = /^#[0-9a-fA-F]{6}$/
const ISO = /^\d{4}-\d{2}-\d{2}$/
const TYPE_COLOR = { 'ไฟฟ้า': '#143f77', 'โยธา': '#e2cc7a', 'คนสวน': '#10b981' }

const customEvents = registerCollection('customEvents', [
  { id: 1, owner: 1, title: 'ประชุมประจำเดือน', start: '2026-10-14', end: '2026-10-14', color: '#0b98e0', note: 'ห้องประชุมกองช่าง' },
])

const todos = registerCollection('todos', [
  { id: 1, owner: 1, text: 'เซ็นเอกสารอนุมัติการลา', done: true },
  { id: 2, owner: 1, text: 'อนุมัติงบประมาณ', done: false },
  { id: 3, owner: 1, text: 'ติดตามสถานะงาน', done: false },
  { id: 4, owner: 1, text: 'ตรวจสอบอัตรากำลังเพื่อขอรับสมัครคนเพิ่ม', done: false },
  { id: 5, owner: 1, text: 'ติดตามผลการดำเนินงานที่ล่าช้า', done: true },
  { id: 6, owner: 1, text: 'มอบหมายงานใหม่', done: true },
])

function visibleWorks(u) {
  if (u.role === 'director') return works
  const id = u.memberId
  if (!id) return []
  const covered = new Set()
  for (const l of leaves) {
    if (l.status !== 'approved' || l.substituteId !== id) continue
    for (const w of works) {
      if (w.officers.includes(l.memberId) && w.progress !== 'done' && w.start <= l.end && l.start <= w.end) covered.add(w.id)
    }
  }
  return works.filter((w) => w.officers.includes(id) || covered.has(w.id))
}

function workEvents(u) {
  return visibleWorks(u).map((w) => {
    const names = (w.officers ?? []).map((id) => staff.find((s) => s.id === id)?.name).filter(Boolean)
    return {
      id: w.id, kind: 'work', title: w.title, start: w.start, end: w.end,
      color: TYPE_COLOR[w.type] || '#64748b',
      subtitle: u.role === 'director' ? (names.length ? names.join(', ') : 'ยังไม่มอบหมาย') : (w.address || ''),
    }
  })
}

const mineEv = (u) => customEvents.filter((e) => e.owner === u.id)
const mineTodo = (u) => todos.filter((t) => t.owner === u.id)

router.get('/events', requireAuth, (req, res) =>
  res.json([...workEvents(req.user), ...mineEv(req.user).map((e) => ({ ...e, kind: 'custom' }))])
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
    id: Math.max(0, ...customEvents.map((event) => event.id)) + 1,
    owner: req.user.id, title, start: b.start, end: b.end, color: b.color,
    note: String(b.note ?? '').slice(0, 500),
  }
  customEvents.push(ev)
  res.status(201).json({ ...ev, kind: 'custom' })
})

router.delete('/events/:id', requireAuth, (req, res) => {
  const i = customEvents.findIndex((e) => e.id === Number(req.params.id) && e.owner === req.user.id)
  if (i === -1) return res.status(404).json({ error: 'ไม่พบกิจกรรม' })
  customEvents.splice(i, 1)
  res.json({ ok: true })
})

// ---------- รายการสิ่งที่ต้องทำ ----------
// ครั้งแรกที่ผู้ใช้เปิด: สร้างรายการเริ่มต้นให้ ผอ. (id 1) ส่วนคนอื่นเริ่มว่าง
router.get('/todos', requireAuth, (req, res) => res.json(mineTodo(req.user).map(({ owner, ...t }) => t)))

router.post('/todos', requireAuth, (req, res) => {
  const text = String(req.body?.text ?? '').trim().slice(0, 150)
  if (!text) return res.status(400).json({ error: 'กรุณากรอกข้อความ' })
  const t = { id: Math.max(0, ...todos.map((todo) => todo.id)) + 1, owner: req.user.id, text, done: false }
  todos.push(t)
  const { owner, ...out } = t
  res.status(201).json(out)
})

router.patch('/todos/:id', requireAuth, (req, res) => {
  const t = todos.find((x) => x.id === Number(req.params.id) && x.owner === req.user.id)
  if (!t) return res.status(404).json({ error: 'ไม่พบรายการ' })
  t.done = Boolean(req.body?.done)
  res.json({ id: t.id, text: t.text, done: t.done })
})

router.delete('/todos/:id', requireAuth, (req, res) => {
  const i = todos.findIndex((x) => x.id === Number(req.params.id) && x.owner === req.user.id)
  if (i === -1) return res.status(404).json({ error: 'ไม่พบรายการ' })
  todos.splice(i, 1)
  res.json({ ok: true })
})

export default router
