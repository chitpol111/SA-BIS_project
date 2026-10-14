import { Router } from 'express'
import { requireAuth, requireRole } from './auth.js'
import multer from 'multer'
import { registerCollection, afterStateCommit } from './db.js'
import { removeFile, signedFileUrl, uploadFile } from './storage.js'
import { members } from './team.js'

const router = Router()

// ไฟล์เอกสารแนบใบลา (PDF/รูป ไม่เกิน 4MB ต่อไฟล์ แนบได้สูงสุด 3 ไฟล์)
const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_DOCS = 3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_r, f, cb) => (DOC_TYPES.includes(f.mimetype) ? cb(null, true) : cb(new Error('รองรับเฉพาะ PDF, JPG, PNG, WebP'))),
})
const docDir = (memberId) => `leave-docs/${memberId}/`
const byId = (id) => members.find((m) => m.id === id)
const overlap = (a, b) => a.start <= b.end && b.start <= a.end

// สิทธิ์การลาแต่ละประเภท (ตาม Figma)
const ENTITLEMENTS = [
  { name: 'ลาป่วย', value: 60, unit: 'วัน' },
  { name: 'ลากิจส่วนตัว', value: 30, unit: 'วัน' },
  { name: 'ลาพักร้อน', value: 10, unit: 'วัน' },
  { name: 'ลาคลอดบุตร', value: 90, unit: 'วัน' },
  { name: 'ลาช่วยภรรยาคลอดบุตร', value: 15, unit: 'วัน' },
  { name: 'ลาอุปสมบท', value: 120, unit: 'วัน' },
  { name: 'ลาไปศึกษา', value: 4, unit: 'ปี' },
  { name: 'ลาติดตามคู่สมรส', value: 2, unit: 'ปี' },
  { name: 'ลาเข้ารับการเตรียมพล', value: 7, unit: 'วัน' },
  { name: 'ลาไปฟื้นฟูสมรรถภาพ', value: 12, unit: 'วัน' },
]
const TYPES = ENTITLEMENTS.map((e) => e.name)
const STATUSES = ['pending', 'approved', 'rejected']

// [memberId, type, start, end, substituteId, status]
const RAW = [
  [1,  'ลาป่วย',              '2026-10-15', '2026-10-18', 2,  'pending'],
  [3,  'ลากิจส่วนตัว',         '2026-10-13', '2026-10-14', 4,  'approved'],
  [6,  'ลาพักร้อน',            '2026-10-20', '2026-10-24', 7,  'pending'],
  [7,  'ลาป่วย',              '2026-10-16', '2026-10-17', 8,  'pending'],
  [11, 'ลากิจส่วนตัว',         '2026-10-15', '2026-10-15', 12, 'pending'],
  [12, 'ลาพักร้อน',            '2026-10-15', '2026-10-19', 13, 'pending'],
  [16, 'ลาป่วย',              '2026-10-13', '2026-10-13', 17, 'approved'],
  [18, 'ลาคลอดบุตร',           '2026-11-01', '2027-01-30', 19, 'pending'],
  [21, 'ลาช่วยภรรยาคลอดบุตร',  '2026-10-26', '2026-11-09', 22, 'pending'],
  [22, 'ลาไปศึกษา',            '2027-01-05', '2027-03-31', 23, 'pending'],
  [26, 'ลาป่วย',              '2026-10-08', '2026-10-10', 27, 'rejected'],
  [28, 'ลาพักร้อน',            '2026-10-27', '2026-10-30', 29, 'pending'],
  [31, 'ลากิจส่วนตัว',         '2026-10-21', '2026-10-21', 32, 'pending'],
  [33, 'ลาอุปสมบท',            '2026-11-10', '2027-02-08', 34, 'pending'],
  [2,  'ลาป่วย',              '2026-10-14', '2026-10-14', 3,  'pending'],
  [35, 'ลาพักร้อน',            '2026-10-19', '2026-10-23', 34, 'pending'],
  [1,  'ลากิจส่วนตัว',         '2026-10-15', '2026-10-18', 3,  'approved'],
]

export const leaves = registerCollection('leaves', RAW.map(([memberId, type, start, end, substituteId, status], i) => ({
  id: i + 1, memberId, type, start, end, substituteId, status,
})))

const view = (l) => ({
  ...l,
  name: byId(l.memberId)?.name ?? '-',
  substitute: byId(l.substituteId)?.name ?? '-',
})

function summary() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const pending = leaves.filter((l) => l.status === 'pending')
  const team = (l) => byId(l.memberId)?.teamId

  return {
    pending: pending.length,
    // คนที่ลาอยู่วันนี้ (ไม่นับใบที่ไม่อนุมัติ)
    today: leaves.filter((l) => l.status !== 'rejected' && l.start <= today && today <= l.end).length,
    // ใบที่รออนุมัติ และมีคนในทีมเดียวกันลาช่วงเดียวกัน
    overlap: pending.filter((l) =>
      leaves.some((o) => o.id !== l.id && o.status !== 'rejected' && team(o) === team(l) && overlap(o, l))
    ).length,
    // ใบที่รออนุมัติ และคนลามีงานค้างที่ชนช่วงลา
    impact: pending.filter((l) =>
      byId(l.memberId)?.jobs.some((j) => j.status !== 'done' && overlap(j, l))
    ).length,
    entitlements: ENTITLEMENTS,
    // ข้อมูลตัวอย่างสำหรับกราฟ (ตาม Figma)
    chart: [
      { name: 'ลาป่วย', value: 12 },
      { name: 'ลากิจ', value: 8 },
      { name: 'ลาพักร้อน', value: 5 },
      { name: 'ลาคลอด', value: 3 },
    ],
  }
}

router.get('/', requireAuth, (_req, res) => res.json(leaves.map(view)))
router.get('/summary', requireAuth, (_req, res) => res.json(summary()))

router.patch('/:id', ...requireRole('director'), (req, res) => {
  const l = leaves.find((x) => x.id === Number(req.params.id))
  if (!l) return res.status(404).json({ error: 'ไม่พบรายการลา' })
  const { status } = req.body ?? {}
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' })
  l.status = status
  res.json(view(l))
})

// ---------- ส่วนของเจ้าหน้าที่ ----------
const DURATIONS = ['full', 'half-am', 'half-pm', 'multi']
const ISO = /^\d{4}-\d{2}-\d{2}$/
const mineOf = (u) => leaves.filter((l) => u.memberId && l.memberId === u.memberId)
const nextId = () => Math.max(0, ...leaves.map((l) => l.id)) + 1

function validate(b, user) {
  if (!TYPES.includes(b.type)) return 'ประเภทการลาไม่ถูกต้อง'
  if (!DURATIONS.includes(b.duration)) return 'ระยะเวลาการลาไม่ถูกต้อง'
  if (!ISO.test(b.start)) return 'วันที่ลาไม่ถูกต้อง'
  if (b.duration === 'multi' && (!ISO.test(b.end) || b.end <= b.start)) return 'วันสิ้นสุดต้องหลังวันเริ่มต้น'
  const me = byId(user.memberId)
  const sub = byId(Number(b.substituteId))
  if (!sub || sub.id === me?.id || sub.teamId !== me?.teamId) return 'กรุณาเลือกผู้แทนในทีมเดียวกัน'
  if (b.attachments !== undefined) {
    if (!Array.isArray(b.attachments) || b.attachments.length > MAX_DOCS) return `แนบเอกสารได้ไม่เกิน ${MAX_DOCS} ไฟล์`
    const dir = docDir(user.memberId)
    if (b.attachments.some((a) => typeof a?.path !== 'string' || !a.path.startsWith(dir) || a.path.includes('..'))) {
      return 'ไฟล์แนบไม่ถูกต้อง'
    }
  }
  return null
}

function fields(b) {
  const end = b.duration === 'multi' ? b.end : b.start
  return {
    type: b.type, duration: b.duration, start: b.start, end,
    substituteId: Number(b.substituteId),
    note: String(b.note ?? '').slice(0, 1000),
    attachments: (Array.isArray(b.attachments) ? b.attachments : []).slice(0, MAX_DOCS).map((a) => ({
      path: a.path,
      name: String(a.name || 'เอกสาร').slice(0, 200),
      size: Number(a.size) || 0,
      type: String(a.type || '').slice(0, 60),
      uploadedAt: a.uploadedAt && !Number.isNaN(Date.parse(a.uploadedAt)) ? new Date(a.uploadedAt).toISOString() : new Date().toISOString(),
    })),
  }
}

// ---------- ไฟล์แนบ (ต้องอยู่ก่อนเส้นทาง /:id) ----------
router.post('/attachment', requireAuth, (req, res) => {
  if (!req.user.memberId) return res.status(403).json({ error: 'บัญชีนี้ไม่ได้ผูกกับบุคลากร' })
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 4MB' : err.message
      return res.status(400).json({ error: msg })
    }
    if (!req.file) return res.status(400).json({ error: 'ไม่พบไฟล์' })
    uploadFile(req.file, docDir(req.user.memberId).slice(0, -1))
      .then((path) => res.status(201).json({
        path,
        name: Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 200),
        size: req.file.size,
        type: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      }))
      .catch((e) => {
        console.error('Failed to store leave document:', e)
        res.status(503).json({ error: 'บันทึกไฟล์ไม่สำเร็จ กรุณาลองใหม่ภายหลัง' })
      })
  })
})

// ลบไฟล์ที่เพิ่งอัปโหลดและยังไม่ผูกกับใบลาใด
router.delete('/attachment', requireAuth, async (req, res) => {
  const path = String(req.query.path ?? '')
  if (!req.user.memberId || !path.startsWith(docDir(req.user.memberId)) || path.includes('..')) {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบไฟล์นี้' })
  }
  if (leaves.some((l) => l.attachments?.some((a) => a.path === path))) {
    return res.status(400).json({ error: 'ไฟล์นี้ถูกใช้กับใบลาอยู่' })
  }
  try {
    await removeFile(path)
    res.json({ ok: true })
  } catch (e) {
    console.error('Failed to remove leave document:', e)
    res.status(503).json({ error: 'ลบไฟล์ไม่สำเร็จ' })
  }
})

// ลิงก์เปิดไฟล์ (ชั่วคราว 1 ชม.) เจ้าของใบลาหรือผอ.เท่านั้น
router.get('/attachment-url', requireAuth, async (req, res) => {
  const path = String(req.query.path ?? '')
  const ok = path.startsWith('leave-docs/') && !path.includes('..') &&
    (req.user.role === 'director' || (req.user.memberId && path.startsWith(docDir(req.user.memberId))))
  if (!ok) return res.status(403).json({ error: 'ไม่มีสิทธิ์เปิดไฟล์นี้' })
  try {
    res.json({ url: await signedFileUrl(path) })
  } catch (e) {
    console.error('Failed to sign leave document:', e)
    res.status(503).json({ error: 'เปิดไฟล์ไม่สำเร็จ' })
  }
})

router.get('/mine', requireAuth, (req, res) =>
  res.json(mineOf(req.user).map(view).sort((a, b) => b.id - a.id))
)

router.get('/colleagues', requireAuth, (req, res) => {
  const me = byId(req.user.memberId)
  if (!me) return res.json([])
  res.json(members.filter((m) => m.teamId === me.teamId && m.id !== me.id).map((m) => ({ id: m.id, name: m.name })))
})

// รายละเอียดใบลา (เฉพาะผอ.) ต้องอยู่หลัง /mine และ /colleagues
router.get('/:id', ...requireRole('director'), (req, res) => {
  const l = leaves.find((x) => x.id === Number(req.params.id))
  if (!l) return res.status(404).json({ error: 'ไม่พบรายการลา' })
  const m = byId(l.memberId)
  res.json({
    ...view(l),
    duration: l.duration || (l.start === l.end ? 'full' : 'multi'),
    note: l.note || '',
    createdAt: l.createdAt || null,
    attachments: l.attachments || [],
    requester: { id: l.memberId, name: m?.name ?? '-', dept: m?.dept ?? '-', position: m?.position ?? '-' },
  })
})

router.post('/', requireAuth, (req, res) => {
  if (!req.user.memberId) return res.status(403).json({ error: 'บัญชีนี้ไม่ได้ผูกกับบุคลากร' })
  const b = req.body ?? {}
  const err = validate(b, req.user)
  if (err) return res.status(400).json({ error: err })
  const leave = { id: nextId(), memberId: req.user.memberId, status: 'pending', createdAt: new Date().toISOString(), ...fields(b) }
  leaves.push(leave)
  res.status(201).json(view(leave))
})

router.put('/:id', requireAuth, (req, res) => {
  const l = mineOf(req.user).find((x) => x.id === Number(req.params.id))
  if (!l) return res.status(404).json({ error: 'ไม่พบใบลาของคุณ' })
  if (l.status !== 'pending') return res.status(400).json({ error: 'แก้ไขได้เฉพาะใบลาที่รออนุมัติ' })
  const err = validate(req.body ?? {}, req.user)
  if (err) return res.status(400).json({ error: err })
  const before = (l.attachments ?? []).map((a) => a.path)
  Object.assign(l, fields(req.body))
  const kept = new Set(l.attachments.map((a) => a.path))
  const dropped = before.filter((p) => !kept.has(p))
  afterStateCommit(() => Promise.all(dropped.map((p) => removeFile(p).catch(console.error))))
  res.json(view(l))
})

router.delete('/:id', requireAuth, (req, res) => {
  const i = leaves.findIndex((x) => x.id === Number(req.params.id) && x.memberId === req.user.memberId)
  if (i === -1) return res.status(404).json({ error: 'ไม่พบใบลาของคุณ' })
  if (leaves[i].status !== 'pending') return res.status(400).json({ error: 'ยกเลิกได้เฉพาะใบลาที่รออนุมัติ' })
  const [gone] = leaves.splice(i, 1)
  const paths = (gone.attachments ?? []).map((a) => a.path)
  afterStateCommit(() => Promise.all(paths.map((p) => removeFile(p).catch(console.error))))
  res.json({ ok: true })
})

export { TYPES }
export default router
