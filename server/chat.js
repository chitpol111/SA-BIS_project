import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from './auth.js'
import { members } from './team.js'
import { afterStateFailure, registerCollection, registerMap } from './db.js'
import { removeFile, signedFileUrl, uploadFile } from './storage.js'

const router = Router()
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_r, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(new Error('รองรับเฉพาะ JPG, PNG, WebP, PDF'))),
})

const messages = registerCollection('messages')
const notes = registerMap('notes')

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

router.get('/:otherId', requireAuth, async (req, res) => {
  const p = peer(req, res)
  if (!p) return
  const { me, other } = p
  res.json({
    messages: await Promise.all(messages
      .filter((m) => (m.from === me.id && m.to === other.id) || (m.from === other.id && m.to === me.id))
      .map(async (message) => ({
        ...message,
        file: message.file ? { ...message.file, url: await signedFileUrl(message.file.path) } : null,
      }))),
    note: notes.get(`${me.id}:${other.id}`) ?? '',
  })
})

router.post('/:otherId', requireAuth, (req, res) => {
  const p = peer(req, res)
  if (!p) return
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 4MB' : err.message })
    }
    const text = String(req.body?.text ?? '').trim().slice(0, 2000)
    if (!text && !req.file) return res.status(400).json({ error: 'กรุณาพิมพ์ข้อความหรือแนบไฟล์' })
    const save = async () => {
      const path = req.file ? await uploadFile(req.file, 'chat-files') : null
      const msg = {
        id: Math.max(0, ...messages.map((message) => message.id)) + 1,
        from: p.me.id, to: p.other.id, text,
        file: req.file
          ? { path, type: req.file.mimetype, name: Buffer.from(req.file.originalname, 'latin1').toString('utf8') }
          : null,
        createdAt: new Date().toISOString(),
      }
      messages.push(msg)
      if (path) afterStateFailure(() => removeFile(path))
      res.status(201).json({
        ...msg,
        file: msg.file ? { ...msg.file, url: await signedFileUrl(path) } : null,
      })
    }
    save().catch((error) => {
      console.error('Failed to store chat message:', error)
      res.status(503).json({ error: 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่ภายหลัง' })
    })
  })
})

router.put('/:otherId/note', requireAuth, (req, res) => {
  const p = peer(req, res)
  if (!p) return
  notes.set(`${p.me.id}:${p.other.id}`, String(req.body?.note ?? '').slice(0, 2000))
  res.json({ ok: true })
})

export default router
