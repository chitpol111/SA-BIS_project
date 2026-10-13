import { Router } from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import { requireAuth } from './auth.js'
import { members } from './team.js'
import { UPLOAD_DIR } from './work.js'

const router = Router()
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_r, f, cb) => cb(null, crypto.randomUUID() + EXT[f.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_r, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(new Error('รองรับเฉพาะ JPG, PNG, WebP, PDF'))),
})

const messages = [] // { id, from, to, text, file, createdAt }
const notes = new Map() // `${me}:${other}` -> text
let nextId = 1

// ตรวจว่าเป็นสมาชิกทีมเดียวกัน
function peer(req, res) {
  const meId = req.user.memberId
  const me = members.find((m) => m.id === meId)
  const other = members.find((m) => m.id === Number(req.params.otherId))
  if (!me) return res.status(403).json({ error: 'บัญชีนี้ไม่ได้ผูกกับบุคลากร' }) && null
  if (!other || other.id === me.id) return res.status(404).json({ error: 'ไม่พบผู้ใช้' }) && null
  if (other.teamId !== me.teamId) return res.status(403).json({ error: 'แชทได้เฉพาะสมาชิกในทีมเดียวกัน' }) && null
  return { me, other }
}

router.get('/:otherId', requireAuth, (req, res) => {
  const p = peer(req, res)
  if (!p) return
  const { me, other } = p
  res.json({
    messages: messages.filter((m) => (m.from === me.id && m.to === other.id) || (m.from === other.id && m.to === me.id)),
    note: notes.get(`${me.id}:${other.id}`) ?? '',
  })
})

router.post('/:otherId', requireAuth, (req, res) => {
  const p = peer(req, res)
  if (!p) return
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5MB' : err.message })
    }
    const text = String(req.body?.text ?? '').trim().slice(0, 2000)
    if (!text && !req.file) return res.status(400).json({ error: 'กรุณาพิมพ์ข้อความหรือแนบไฟล์' })
    const msg = {
      id: nextId++, from: p.me.id, to: p.other.id, text,
      file: req.file
        ? { url: '/uploads/' + req.file.filename, type: req.file.mimetype,
            name: Buffer.from(req.file.originalname, 'latin1').toString('utf8') }
        : null,
      createdAt: new Date().toISOString(),
    }
    messages.push(msg)
    res.status(201).json(msg)
  })
})

router.put('/:otherId/note', requireAuth, (req, res) => {
  const p = peer(req, res)
  if (!p) return
  notes.set(`${p.me.id}:${p.other.id}`, String(req.body?.note ?? '').slice(0, 2000))
  res.json({ ok: true })
})

export default router
