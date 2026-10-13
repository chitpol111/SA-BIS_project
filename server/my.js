import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { requireAuth } from './auth.js'
import { works, UPLOAD_DIR } from './work.js'
import { leaves } from './leave.js'
import { members } from './team.js'

const router = Router()
const PROGRESS = ['notstarted', 'progress', 'done']
const WEIGHT = { notstarted: 0, progress: 0.5, done: 1 }
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_r, f, cb) => cb(null, crypto.randomUUID() + EXT[f.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
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

const view = (w, forName) => ({
  id: w.id, title: w.title, type: w.type, start: w.start, end: w.end, address: w.address,
  priority: w.priority, progress: w.progress, photo: w.photo || '',
  staffNote: w.staffNote || '', updates: w.updates || [], substituteFor: forName || '',
})

router.get('/jobs', requireAuth, (req, res) => {
  const list = mine(req.user)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const todays = list.filter((w) => w.start <= today && today <= w.end)
  const count = (p) => list.filter((w) => w.progress === p).length

  res.json({
    jobs: list
      .map((w) => view(w))
      .sort((a, b) => (a.progress === 'done') - (b.progress === 'done') || a.start.localeCompare(b.start)),
    stats: {
      total: list.length, notstarted: count('notstarted'), progress: count('progress'), done: count('done'),
      todayPct: pct(todays), allPct: pct(list),
    },
  })
})

router.get('/substitute', requireAuth, (req, res) =>
  res.json(substitutes(req.user).map(({ w, forName }) => view(w, forName)))
)

router.get('/jobs/:id', requireAuth, (req, res) => {
  const a = access(req.user, Number(req.params.id))
  if (!a) return res.status(404).json({ error: 'ไม่พบงานที่มอบหมายให้คุณ' })
  res.json(view(a.w, a.forName))
})

router.patch('/jobs/:id', requireAuth, (req, res) => {
  const a = access(req.user, Number(req.params.id))
  if (!a) return res.status(404).json({ error: 'ไม่พบงานที่มอบหมายให้คุณ' })
  const { progress, staffNote } = req.body ?? {}
  if (progress !== undefined) {
    if (!PROGRESS.includes(progress)) return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' })
    a.w.progress = progress
  }
  if (staffNote !== undefined) a.w.staffNote = String(staffNote).slice(0, 500)
  res.json(view(a.w, a.forName))
})

router.post('/jobs/:id/updates', requireAuth, (req, res) => {
  const a = access(req.user, Number(req.params.id))
  if (!a) return res.status(404).json({ error: 'ไม่พบงานที่มอบหมายให้คุณ' })
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5MB'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'แนบได้ครั้งละไม่เกิน 5 ไฟล์'
        : err.message
      return res.status(400).json({ error: msg })
    }
    for (const f of req.files ?? []) {
      a.w.updates.push({
        url: '/uploads/' + f.filename,
        name: Buffer.from(f.originalname, 'latin1').toString('utf8'),
        type: f.mimetype,
      })
    }
    res.json(view(a.w, a.forName))
  })
})

router.delete('/jobs/:id/updates/:file', requireAuth, (req, res) => {
  const a = access(req.user, Number(req.params.id))
  if (!a) return res.status(404).json({ error: 'ไม่พบงานที่มอบหมายให้คุณ' })
  const i = a.w.updates.findIndex((u) => path.basename(u.url) === req.params.file)
  if (i === -1) return res.status(404).json({ error: 'ไม่พบไฟล์' })
  const [removed] = a.w.updates.splice(i, 1)
  fs.unlink(path.join(UPLOAD_DIR, path.basename(removed.url)), () => {})
  res.json(view(a.w, a.forName))
})

export default router
