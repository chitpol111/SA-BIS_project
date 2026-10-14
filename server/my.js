import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from './auth.js'
import { works } from './work.js'
import { leaves } from './leave.js'
import { members } from './team.js'
import { afterStateCommit, afterStateFailure } from './db.js'
import { removeFile, signedFileUrl, uploadFile } from './storage.js'

const router = Router()
const PROGRESS = ['notstarted', 'progress', 'done']
const WEIGHT = { notstarted: 0, progress: 0.5, done: 1 }
const TYPE_PHOTOS = {
  'ไฟฟ้า': '/work-default.png',
  'โยธา': '/work-civil.png',
  'คนสวน': '/work-garden.png',
}
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 5 },
  fileFilter: (_r, f, cb) =>
    EXT[f.mimetype] ? cb(null, true) : cb(new Error('รองรับเฉพาะ JPG, PNG, WebP, PDF')),
})

const mine = (u) => (u.memberId ? works.filter((w) => w.officers.includes(u.memberId)) : [])

// งานของคนที่ลา (อนุมัติแล้ว) โดยตั้งเราเป็นผู้แทน
function substitutes(u) {
  const out = []
  if (!u.memberId) return out
  for (const l of leaves) {
    if (l.status !== 'approved' || l.substituteId !== u.memberId) continue
    const forName = members.find((m) => m.id === l.memberId)?.name ?? '-'
    for (const w of works) {
      if (w.officers.includes(u.memberId) || out.some((o) => o.w.id === w.id)) continue
      if (w.officers.includes(l.memberId) && w.progress !== 'done' && w.start <= l.end && l.start <= w.end) {
        out.push({ w, forName })
      }
    }
  }
  return out
}

const access = (u, id) =>
  mine(u).map((w) => ({ w })).concat(substitutes(u)).find((x) => x.w.id === id)

const pct = (list) =>
  list.length ? Math.round((list.reduce((s, w) => s + WEIGHT[w.progress], 0) / list.length) * 100) : 0

const view = async (w, forName) => ({
  id: w.id, title: w.title, type: w.type, start: w.start, end: w.end, address: w.address,
  priority: w.priority, progress: w.progress,
  photo: (await signedFileUrl(w.photo)) || TYPE_PHOTOS[w.type] || TYPE_PHOTOS['ไฟฟ้า'],
  staffNote: w.staffNote || '',
  updates: await Promise.all((w.updates || []).map(async (update) => ({
    ...update, url: await signedFileUrl(update.path),
  }))),
  substituteFor: forName || '',
})

router.get('/jobs', requireAuth, async (req, res) => {
  const list = mine(req.user)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const todays = list.filter((w) => w.start <= today && today <= w.end)
  const count = (p) => list.filter((w) => w.progress === p).length

  res.json({
    jobs: (await Promise.all(list.map((work) => view(work))))
      .sort((a, b) => (a.progress === 'done') - (b.progress === 'done') || a.start.localeCompare(b.start)),
    stats: {
      total: list.length, notstarted: count('notstarted'), progress: count('progress'), done: count('done'),
      todayPct: pct(todays), allPct: pct(list),
    },
  })
})

router.get('/substitute', requireAuth, async (req, res) =>
  res.json(await Promise.all(substitutes(req.user).map(({ w, forName }) => view(w, forName))))
)

router.get('/jobs/:id', requireAuth, async (req, res) => {
  const a = access(req.user, Number(req.params.id))
  if (!a) return res.status(404).json({ error: 'ไม่พบงานที่มอบหมายให้คุณ' })
  res.json(await view(a.w, a.forName))
})

router.patch('/jobs/:id', requireAuth, async (req, res) => {
  const a = access(req.user, Number(req.params.id))
  if (!a) return res.status(404).json({ error: 'ไม่พบงานที่มอบหมายให้คุณ' })
  const { progress, staffNote } = req.body ?? {}
  if (progress !== undefined) {
    if (!PROGRESS.includes(progress)) return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' })
    a.w.progress = progress
  }
  if (staffNote !== undefined) a.w.staffNote = String(staffNote).slice(0, 500)
  res.json(await view(a.w, a.forName))
})

router.post('/jobs/:id/updates', requireAuth, (req, res) => {
  const a = access(req.user, Number(req.params.id))
  if (!a) return res.status(404).json({ error: 'ไม่พบงานที่มอบหมายให้คุณ' })
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 4MB'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'แนบได้ครั้งละไม่เกิน 5 ไฟล์'
        : err.message
      return res.status(400).json({ error: msg })
    }
    const files = req.files ?? []
    if (files.reduce((total, file) => total + file.size, 0) > 4 * 1024 * 1024) {
      return res.status(400).json({ error: 'ขนาดไฟล์รวมต้องไม่เกิน 4MB' })
    }
    const save = async () => {
      const updates = []
      try {
        for (const file of files) {
          updates.push({
            path: await uploadFile(file, 'work-updates'),
            name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            type: file.mimetype,
          })
        }
      } catch (error) {
        await Promise.all(updates.map((update) => removeFile(update.path)))
        throw error
      }
      a.w.updates.push(...updates)
      afterStateFailure(() => Promise.all(updates.map((update) => removeFile(update.path))))
      res.json(await view(a.w, a.forName))
    }
    save().catch((error) => {
      console.error('Failed to store work update files:', error)
      res.status(503).json({ error: 'บันทึกไฟล์ไม่สำเร็จ กรุณาลองใหม่ภายหลัง' })
    })
  })
})

router.delete('/jobs/:id/updates/:file', requireAuth, async (req, res) => {
  const a = access(req.user, Number(req.params.id))
  if (!a) return res.status(404).json({ error: 'ไม่พบงานที่มอบหมายให้คุณ' })
  const i = a.w.updates.findIndex((u) => u.path.split('/').pop() === req.params.file)
  if (i === -1) return res.status(404).json({ error: 'ไม่พบไฟล์' })
  const [removed] = a.w.updates.splice(i, 1)
  afterStateCommit(() => removeFile(removed.path))
  res.json(await view(a.w, a.forName))
})

export default router
