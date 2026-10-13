import { Router } from 'express'
import { requireAuth, requireRole } from './auth.js'

const router = Router()
const HEX = /^#[0-9a-fA-F]{6}$/

export const teams = [
  { id: 1, name: 'ทีมไฟฟ้า',      dept: 'ไฟฟ้า',      front: '#3d6ea6', back: '#143f77' },
  { id: 2, name: 'ทีมโยธา',       dept: 'โยธา',       front: '#d4af37', back: '#ffd60a' },
  { id: 3, name: 'ทีมเขียนแบบ',   dept: 'เขียนแบบ',   front: '#8b5cf6', back: '#595a7a' },
  { id: 4, name: 'ทีมสำรวจ',      dept: 'สำรวจ',      front: '#f97316', back: '#b4654a' },
  { id: 5, name: 'ทีมประปา',      dept: 'ประปา',      front: '#0ea5e9', back: '#b8cfe8' },
  { id: 6, name: 'ทีมสวนสาธารณะ', dept: 'สวนสาธารณะ', front: '#10b981', back: '#00ff00' },
  { id: 7, name: 'ทีมธุรการ',     dept: 'ธุรการ',     front: '#d9d9d9', back: '#64748b' },
]

// คนแรกของแต่ละทีม = หัวหน้าทีม
const ROSTER = {
  1: ['คุณแม่ น้องฟ้าใส', 'นายชาไทย วิปครีม', 'นายโกโก้ คมเข้ม', 'นางสาวมัตจะ ลาเต้', 'นางสาวชานม ไข่มุก'],
  2: ['นายเอสเปรสโซ่ เข้มข้น', 'นางสาวคาราเมล มัคคิอาโต้', 'นายนมสด ใจดี', 'นางสาวบราวนี่ ช็อกโกแลต', 'นายคุกกี้ กรอบนอก'],
  3: ['นางสาวสตรอว์เบอร์รี่ ปั่นสด', 'นายบลูเบอร์รี่ ชีสเค้ก', 'นางสาวพุดดิ้ง ไข่หวาน', 'นายวุ้นกะทิ เย็นฉ่ำ', 'นางสาวมาการอง พาสเทล'],
  4: ['นายอเมริกาโน คาปูชิโน', 'นางสาวทับทิม น้ำแข็งใส', 'นายลำไย ลอยแก้ว', 'นางสาวเฉาก๊วย นมสด', 'นายแคนตาลูป ปั่นเย็น'],
  5: ['นายน้ำแข็ง เกล็ดหิมะ', 'นางสาวโซดา มะนาว', 'นายสไปรท์ เย็นซ่า', 'นางสาวน้ำผึ้ง มะนาวโซดา', 'นายบัวลอย ไข่หวาน'],
  6: ['นางสาวมะพร้าว น้ำหอม', 'นายกล้วยหอม ทอดกรอบ', 'นางสาวเก๊กฮวย หอมเย็น', 'นายใบเตย กะทิสด', 'นางสาวดอกอัญชัน มะลิลา'],
  7: ['นางสาวขนมปัง เนยสด', 'นายไข่เจียว ฟูนุ่ม', 'นางสาวโดนัท น้ำตาลโรย', 'นายวาฟเฟิล กรอบนอก', 'นางสาวแพนเค้ก เมเปิ้ล'],
}

const POSITIONS = {
  'ไฟฟ้า': ['วิศวกรไฟฟ้า', 'ช่างไฟฟ้า', 'ช่างไฟฟ้า', 'ผู้ช่วยช่างไฟฟ้า'],
  'โยธา': ['วิศวกรโยธา', 'เจ้าพนักงานผังเมือง', 'ช่างโยธา', 'ผู้ช่วยช่างโยธา'],
  'เขียนแบบ': ['นายช่างเขียนแบบ', 'สถาปนิก', 'ผู้ช่วยช่างเขียนแบบ', 'ผู้ช่วยช่างเขียนแบบ'],
  'สำรวจ': ['นายช่างสำรวจ', 'ผู้ช่วยช่างสำรวจ', 'ผู้ช่วยช่างสำรวจ', 'ผู้ช่วยช่างสำรวจ'],
  'ประปา': ['วิศวกรประปา', 'ช่างประปา', 'ช่างประปา', 'ผู้ช่วยช่างประปา'],
  'สวนสาธารณะ': ['นักจัดการงานทั่วไป', 'คนสวน', 'คนสวน', 'คนงานทั่วไป'],
  'ธุรการ': ['เจ้าพนักงานธุรการ', 'เจ้าหน้าที่พัสดุ', 'เจ้าหน้าที่การเงิน', 'เจ้าหน้าที่ธุรการ'],
}

const TITLES = {
  'ไฟฟ้า': 'ซ่อมเสาไฟฟ้า',
  'โยธา': 'ซ่อมถนน',
  'เขียนแบบ': 'เขียนแบบอาคารสำนักงาน',
  'สำรวจ': 'สำรวจแนวเขตที่ดิน',
  'ประปา': 'ซ่อมท่อประปา',
  'สวนสาธารณะ': 'ตัดแต่งต้นไม้',
  'ธุรการ': 'จัดทำเอกสารจัดซื้อ',
}

// รูปแบบงานของสมาชิกแต่ละคน (ลำดับที่ 1 ตรงกับ Figma: 5 งาน / เสร็จ 1 / กำลังทำ 3 / เกินกำหนด 1)
const PATTERNS = [
  ['progress', 'progress', 'progress', 'done', 'overdue'],
  ['progress'],
  ['progress', 'progress', 'done'],
  ['done', 'done', 'progress', 'overdue'],
  [],
]
const PROGRESS_RANGES = [['2026-10-06', '2026-10-10'], ['2026-10-08', '2026-10-11'], ['2026-10-15', '2026-10-18']]
const DONE_RANGE = ['2026-09-07', '2026-09-14']
const OVERDUE_RANGE = ['2026-10-01', '2026-10-09']

const HISTORY = [
  { date: '2026-09-24', result: 'ใช้งานได้ดี เรียบร้อย' },
  { date: '2026-09-12', result: 'งานเสร็จตามกำหนด ลูกค้าพึงพอใจ' },
  { date: '2026-08-19', result: 'ใช้งานได้ดี เรียบร้อย' },
  { date: '2026-08-01', result: 'ใช้งานได้ดี เรียบร้อย' },
]
const STARTS = ['2024-05-02', '2023-03-15', '2022-08-01', '2025-01-13', '2021-11-22']

export const members = []
let memberId = 0
let jobId = 0

for (const team of teams) {
  ROSTER[team.id].forEach((name, i) => {
    memberId += 1
    let p = 0
    const jobs = PATTERNS[i].map((status) => {
      jobId += 1
      const [start, end] =
        status === 'done' ? DONE_RANGE
        : status === 'overdue' ? OVERDUE_RANGE
        : PROGRESS_RANGES[p++ % PROGRESS_RANGES.length]
      return { id: jobId, title: TITLES[team.dept], type: team.dept, start, end, status }
    })
    const active = jobs.filter((j) => j.status !== 'done').length

    members.push({
      id: memberId,
      teamId: team.id,
      name,
      dept: team.dept,
      position: i === 0 ? 'หัวหน้าทีม' + team.dept : POSITIONS[team.dept][(i - 1) % 4],
      startDate: STARTS[i],
      jobs,
      history: HISTORY.slice(0, i === 4 ? 2 : 4).map((h) => ({ ...h, title: TITLES[team.dept] })),
      available: active <= 1,
      workload: Math.min(100, 30 + active * 12), // ภาระงาน %
      capacity: 20,                               // งาน/เดือน
      contacts: {
        phone: '081' + String(2345000 + memberId * 137).padStart(7, '0'),
        email: `member${memberId}@demo.com`,
        facebook: '',
        line: '',
      },
    })
  })
}

const withCount = (t) => ({ ...t, memberCount: members.filter((m) => m.teamId === t.id).length })

router.get('/', requireAuth, (_req, res) => res.json(teams.map(withCount)))

router.get('/people', requireAuth, (_req, res) =>
  res.json(
    members.map((m) => ({
      id: m.id, teamId: m.teamId, name: m.name, dept: m.dept,
      position: m.position, jobs: m.jobs.length, available: m.available,
    }))
  )
)

router.get('/leave-summary', requireAuth, (_req, res) => res.json({ pending: 12 }))

// ต้องอยู่หลัง /people และ /leave-summary
router.get('/:id', requireAuth, (req, res) => {
  const team = teams.find((t) => t.id === Number(req.params.id))
  if (!team) return res.status(404).json({ error: 'ไม่พบทีม' })
  res.json({ team: withCount(team), members: members.filter((m) => m.teamId === team.id) })
})

router.post('/', ...requireRole('director'), (req, res) => {
  const { name, front, back } = req.body ?? {}
  let n = String(name ?? '').trim().slice(0, 40)
  if (!n) return res.status(400).json({ error: 'กรุณากรอกชื่อทีม' })
  if (!n.startsWith('ทีม')) n = 'ทีม' + n
  if (teams.some((t) => t.name === n)) return res.status(400).json({ error: 'มีทีมชื่อนี้แล้ว' })
  if (!HEX.test(front) || !HEX.test(back)) return res.status(400).json({ error: 'สีไม่ถูกต้อง' })

  const team = {
    id: Math.max(0, ...teams.map((t) => t.id)) + 1,
    name: n, dept: n.replace(/^ทีม/, ''), front, back,
  }
  teams.push(team)
  res.status(201).json(withCount(team))
})

export default router
