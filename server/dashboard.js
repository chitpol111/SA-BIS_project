import { Router } from 'express'
import { requireRole } from './auth.js'
import { works, staff } from './work.js'

const router = Router()

// ประเภทงาน -> ชื่อที่แสดงบนกราฟ (เรียงตามดีไซน์)
const TEAM_ORDER = [
  ['ไฟฟ้า', 'ไฟฟ้า'], ['โยธา', 'โยธา'], ['เขียนแบบ', 'เขียนแบบ'], ['สำรวจ', 'สำรวจ'],
  ['ประปา', 'ประปา'], ['คนสวน', 'สวนสาธารณะ'], ['ธุรการ', 'ธุรการ'], ['อื่นๆ', 'อื่นๆ'],
]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const STATUS_TEXT = { notstarted: 'รอดำเนินการ', progress: 'กำลังดำเนินการ', done: 'เสร็จสมบูรณ์' }
const PERIOD = /^\d{4}(-(0[1-9]|1[0-2]))?$/ // 'YYYY' (ทั้งปี) หรือ 'YYYY-MM' (รายเดือน)

const fmt = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// period: '' = ทุกช่วงเวลา | 'YYYY' = ทั้งปี | 'YYYY-MM' = รายเดือน (นับตามวันที่เริ่มงาน)
export function buildDashboard(list, people, today, period = '') {
  const inPeriod = period ? list.filter((w) => w.start?.startsWith(period)) : list
  const count = (p) => inPeriod.filter((w) => w.progress === p).length

  const teamWork = TEAM_ORDER
    .map(([type, name]) => ({ name, value: inPeriod.filter((w) => w.type === type).length }))
    .filter((t) => t.value > 0 || t.name !== 'อื่นๆ') // แสดง "อื่นๆ" เฉพาะเมื่อมีงาน

  // กราฟรายเดือน: แสดงทั้งปีของช่วงที่เลือก (ถ้าไม่ได้เลือกปี ใช้ปีปัจจุบัน)
  const year = period ? period.slice(0, 4) : today.slice(0, 4)
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    value: list.filter((w) => w.start?.startsWith(`${year}-${String(i + 1).padStart(2, '0')}`)).length,
  }))

  // งานด่วน / เลยกำหนด: ยังไม่เสร็จ และ (ด่วนมาก หรือ เลยวันสิ้นสุดแล้ว) ไม่ขึ้นกับตัวกรองเดือน
  const urgent = list
    .filter((w) => w.progress !== 'done' && (w.priority === 'ด่วนมาก' || w.end < today))
    .sort((a, b) => a.end.localeCompare(b.end) || a.id - b.id)
    .slice(0, 5)
    .map((w) => ({
      id: w.id,
      title: w.title,
      team: w.type,
      due: fmt(w.end),
      owner: (w.officers ?? []).map((id) => people.find((s) => s.id === id)?.name).filter(Boolean).join(', ') || 'ยังไม่มอบหมาย',
      status: STATUS_TEXT[w.progress] ?? STATUS_TEXT.notstarted,
    }))

  // ปีที่มีงานอยู่ในระบบ (ให้เลือกในตัวกรอง) รวมปีปัจจุบันเสมอ
  const years = [...new Set([today.slice(0, 4), ...list.map((w) => w.start?.slice(0, 4)).filter(Boolean)])].sort()

  return {
    period,
    years,
    stats: { total: inPeriod.length, pending: count('notstarted'), inProgress: count('progress'), done: count('done') },
    teamWork,
    monthly,
    urgent,
  }
}

router.get('/', ...requireRole('director'), (req, res) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const period = String(req.query.period ?? '')
  if (period && !PERIOD.test(period)) return res.status(400).json({ error: 'ช่วงเวลาไม่ถูกต้อง' })
  res.json(buildDashboard(works, staff, today, period))
})

export default router
