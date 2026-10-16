import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireRole } from './auth.js'
import { afterStateCommit, afterStateFailure, registerCollection } from './db.js'
import { removeFile, signedFileUrl, uploadFile } from './storage.js'

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error('รองรับเฉพาะ JPG, PNG, WebP')),
})

const router = Router()

export const staff = registerCollection('staff', [
  { id: 1, name: 'นางสาวชานม ไข่มุก', team: 'ไฟฟ้า', available: true },
  { id: 2, name: 'นายชาไทย วิปครีม', team: 'ไฟฟ้า', available: true },
  { id: 3, name: 'นายโกโก้ คมเข้ม', team: 'ไฟฟ้า', available: true },
  { id: 4, name: 'นางสาวมัตจะ ลาเต้', team: 'โยธา', available: false },
  { id: 5, name: 'นางสาวอเมริกาโน คาปูชิโน', team: 'คนสวน', available: true },
])

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

export const works = registerCollection('works', base.map((w) => ({
  description: 'ซ่อมเสาไฟฟ้า แถวๆอำเภอเมือง จัดระเบียบสายไฟด้วย',
  address: '',
  team: 'ทีม' + w.type,
  officers: [],
  note: '',
  photo: '',
  ...w,
  status: (w.officers?.length ?? 0) > 0 ? 'มอบหมายแล้ว' : 'รอมอบหมาย',
})))

const TYPES = ['ไฟฟ้า', 'โยธา', 'คนสวน', 'เขียนแบบ', 'สำรวจ', 'ประปา', 'ธุรการ', 'อื่นๆ']
const PRIORITIES = ['ด่วนมาก', 'ปกติ']

router.get('/', requireAuth, async (_req, res) => {
  res.json(await Promise.all(works.map(async (work) => ({
    ...work,
    photo: await signedFileUrl(work.photo),
    updates: await Promise.all((work.updates ?? []).map(async (update) => ({
      ...update,
      url: await signedFileUrl(update.path),
    }))),
  }))))
})

router.get('/staff', requireAuth, (_req, res) => res.json(staff))

router.get('/:id', requireAuth, async (req, res) => {
  const w = works.find((x) => x.id === Number(req.params.id))
  if (!w) return res.status(404).json({ error: 'ไม่พบงาน' })
  res.json({
    ...w,
    photo: await signedFileUrl(w.photo),
    updates: await Promise.all((w.updates ?? []).map(async (update) => ({
      ...update,
      url: await signedFileUrl(update.path),
    }))),
  })
})

router.post('/:id/photo', ...requireRole('director'), (req, res) => {
  const w = works.find((x) => x.id === Number(req.params.id))
  if (!w) return res.status(404).json({ error: 'ไม่พบงาน' })

  upload.single('photo')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 4MB' : err.message
      return res.status(400).json({ error: msg })
    }
    if (!req.file) return res.status(400).json({ error: 'ไม่พบไฟล์รูป' })
    uploadFile(req.file, 'work-photos').then(async (path) => {
      const previousPhoto = w.photo
      w.photo = path
      afterStateCommit(() => removeFile(previousPhoto))
      afterStateFailure(() => removeFile(path))
      res.json({ photo: await signedFileUrl(path) })
    }).catch((error) => {
      console.error('Failed to store work photo:', error)
      res.status(503).json({ error: 'บันทึกรูปไม่สำเร็จ กรุณาลองใหม่ภายหลัง' })
    })
  })
})

router.delete('/:id/photo', ...requireRole('director'), (req, res) => {
  const w = works.find((x) => x.id === Number(req.params.id))
  if (!w) return res.status(404).json({ error: 'ไม่พบงาน' })
  const previousPhoto = w.photo
  w.photo = ''
  afterStateCommit(() => removeFile(previousPhoto))
  res.json({ photo: '' })
})

// ผอ.เพิ่มงานเอง (ไม่ต้องรับมาจากเรื่องร้องเรียน)
router.post('/', ...requireRole('director'), (req, res) => {
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

  const work = {
    id: Math.max(0, ...works.map((x) => x.id)) + 1,
    title: String(b.title).trim().slice(0, 200),
    type: b.type,
    description: String(b.description ?? '').slice(0, 2000),
    address: String(b.address ?? '').slice(0, 500),
    team: String(b.team || 'ทีม' + b.type).slice(0, 100),
    start: b.start,
    end: b.end,
    officers,
    priority: b.priority,
    note: String(b.note ?? '').slice(0, 500),
    photo: '',
    status: officers.length > 0 ? 'มอบหมายแล้ว' : 'รอมอบหมาย',
    progress: 'notstarted',
    staffNote: '',
    updates: [],
  }
  works.push(work)
  res.status(201).json(work)
})

router.put('/:id', ...requireRole('director'), (req, res) => {
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

// ---- ข้อมูลตัวอย่างสำหรับหน้าเจ้าหน้าที่ ----
const ADDR = 'หมู่ 3 ต.ตลาด อ.เมืองพนมสารคาม จ.ฉะเชิงเทรา'
for (const w of works) {
  w.progress = 'notstarted'
  w.address ||= ADDR
}
const SEED = { 2: 'progress', 4: 'done', 6: 'progress', 7: 'notstarted', 8: 'progress', 9: 'done' }
for (const [id, progress] of Object.entries(SEED)) {
  const w = works.find((x) => x.id === Number(id))
  if (!w) continue
  if (!w.officers.includes(3)) w.officers.push(3)
  w.progress = progress
  w.status = 'มอบหมายแล้ว'
}
for (const id of [7, 8]) {
  const w = works.find((x) => x.id === id)
  w.start = '2026-10-12'
  w.end = '2026-10-16'
}
works.find((x) => x.id === 8).priority = 'ปกติ'

for (const w of works) {
  w.staffNote ??= ''
  w.updates ??= []
}
for (const id of [12, 13]) {
  const w = works.find((x) => x.id === id)
  if (!w.officers.includes(1)) w.officers.push(1)
  w.status = 'มอบหมายแล้ว'
}
works.find((x) => x.id === 13).priority = 'ปกติ'
