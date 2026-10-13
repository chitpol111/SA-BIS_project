import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { requireAuth } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOAD_DIR = path.join(__dirname, 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error('รองรับเฉพาะ JPG, PNG, WebP')),
})

function removePhotoFile(url) {
  if (!url?.startsWith('/uploads/')) return
  fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {})
}

const router = Router()

export const staff = [
  { id: 1, name: 'นางสาวชานม ไข่มุก', team: 'ไฟฟ้า', available: true },
  { id: 2, name: 'นายชาไทย วิปครีม', team: 'ไฟฟ้า', available: true },
  { id: 3, name: 'นายโกโก้ คมเข้ม', team: 'ไฟฟ้า', available: true },
  { id: 4, name: 'นางสาวมัตจะ ลาเต้', team: 'โยธา', available: false },
  { id: 5, name: 'นางสาวอเมริกาโน คาปูชิโน', team: 'คนสวน', available: true },
]

const base = [
  { id: 1,  title: 'ซ่อมเสาไฟฟ้า', type: 'ไฟฟ้า',  start: '2026-10-06', end: '2026-10-10', priority: 'ด่วนมาก' },
  { id: 2,  title: 'ซ่อมเสาไฟฟ้า', type: 'ไฟฟ้า',  start: '2026-10-08', end: '2026-10-11', priority: 'ด่วนมาก', officers: [1, 2] },
  { id: 3,  title: 'ซ่อมถนน',      type: 'โยธา',   start: '2026-10-07', end: '2026-11-20', priority: 'ปกติ' },
  { id: 4,  title: 'ซ่อมท่อประปา', type: 'โยธา',   start: '2026-10-10', end: '2026-10-10', priority: 'ด่วนมาก', officers: [4] },
  { id: 5,  title: 'ตัดต้นไม้',    type: 'คนสวน',  start: '2026-11-04', end: '2026-11-25', priority: 'ปกติ' },
  { id: 6,  title: 'ซ่อมเสาไฟฟ้า', type: 'ไฟฟ้า',  start: '2026-10-15', end: '2026-10-18', priority: 'ด่วนมาก', officers: [1] },
  ...Array.from({ length: 7 }, (_, i) => ({
    id: 7 + i, title: 'ซ่อมเสาไฟฟ้า', type: 'ไฟฟ้า',
    start: '2026-10-15', end: '2026-10-30', priority: 'ด่วนมาก',
  })),
]

export const works = base.map((w) => ({
  description: 'ซ่อมเสาไฟฟ้า แถวๆอำเภอเมือง จัดระเบียบสายไฟด้วย',
  address: '',
  team: 'ทีม' + w.type,
  officers: [],
  note: '',
  photo: '',
  ...w,
  status: (w.officers?.length ?? 0) > 0 ? 'มอบหมายแล้ว' : 'รอมอบหมาย',
}))

const TYPES = ['ไฟฟ้า', 'โยธา', 'คนสวน']
const PRIORITIES = ['ด่วนมาก', 'ปกติ']

router.get('/', requireAuth, (_req, res) => res.json(works))

router.get('/staff', requireAuth, (_req, res) => res.json(staff))

router.get('/:id', requireAuth, (req, res) => {
  const w = works.find((x) => x.id === Number(req.params.id))
  if (!w) return res.status(404).json({ error: 'ไม่พบงาน' })
  res.json(w)
})

router.post('/:id/photo', requireAuth, (req, res) => {
  const w = works.find((x) => x.id === Number(req.params.id))
  if (!w) return res.status(404).json({ error: 'ไม่พบงาน' })

  upload.single('photo')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5MB' : err.message
      return res.status(400).json({ error: msg })
    }
    if (!req.file) return res.status(400).json({ error: 'ไม่พบไฟล์รูป' })
    removePhotoFile(w.photo)
    w.photo = '/uploads/' + req.file.filename
    res.json({ photo: w.photo })
  })
})

router.delete('/:id/photo', requireAuth, (req, res) => {
  const w = works.find((x) => x.id === Number(req.params.id))
  if (!w) return res.status(404).json({ error: 'ไม่พบงาน' })
  removePhotoFile(w.photo)
  w.photo = ''
  res.json({ photo: '' })
})

router.put('/:id', requireAuth, (req, res) => {
  const w = works.find((x) => x.id === Number(req.params.id))
  if (!w) return res.status(404).json({ error: 'ไม่พบงาน' })

  const b = req.body ?? {}
  if (!String(b.title ?? '').trim()) return res.status(400).json({ error: 'กรุณากรอกชื่องาน' })
  if (!TYPES.includes(b.type)) return res.status(400).json({ error: 'ประเภทไม่ถูกต้อง' })
  if (!PRIORITIES.includes(b.priority)) return res.status(400).json({ error: 'ความสำคัญไม่ถูกต้อง' })
  if (!b.start || !b.end || b.end < b.start) {
    return res.status(400).json({ error: 'ระยะเวลาไม่ถูกต้อง' })
  }

  const officers = (Array.isArray(b.officers) ? b.officers : [])
    .map(Number)
    .filter((id) => staff.some((s) => s.id === id))

  Object.assign(w, {
    title: String(b.title).trim().slice(0, 200),
    type: b.type,
    description: String(b.description ?? '').slice(0, 2000),
    address: String(b.address ?? '').slice(0, 500),
    team: String(b.team ?? '').slice(0, 100),
    start: b.start,
    end: b.end,
    officers,
    priority: b.priority,
    note: String(b.note ?? '').slice(0, 500),
    status: officers.length > 0 ? 'มอบหมายแล้ว' : 'รอมอบหมาย',
  })
  res.json(w)
})

export default router
