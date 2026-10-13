import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
export const USERS_FILE = path.join(DATA_DIR, 'users.json')
export const ROLES = ['director', 'staff']
fs.mkdirSync(DATA_DIR, { recursive: true })

// กุญแจเซ็น token: ใช้ JWT_SECRET ถ้ามี ไม่งั้นสร้างเองครั้งแรกแล้วเก็บไว้
function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  const f = path.join(DATA_DIR, 'secret.txt')
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString('hex'), { mode: 0o600 })
  return fs.readFileSync(f, 'utf8').trim()
}
const SECRET = getSecret()

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
  } catch {
    return []
  }
}
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, memberId: u.memberId ?? null })
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10)

const router = Router()

router.post('/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const user = loadUsers().find((u) => u.email.toLowerCase() === email)
  const ok = bcrypt.compareSync(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok) return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })

  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '8h' })
  res.json({ token, user: publicUser(user) })
})

// ตรวจ token และอ่าน role ล่าสุดจากไฟล์ผู้ใช้ทุกครั้ง (แก้ role แล้วมีผลทันที)
export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try {
    const { id } = jwt.verify(token, SECRET)
    const user = loadUsers().find((u) => u.id === id)
    if (!user) throw new Error('no user')
    req.user = publicUser(user)
    next()
  } catch {
    res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' })
  }
}

export const requireRole = (...roles) => [
  requireAuth,
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'ไม่มีสิทธิ์ใช้งานส่วนนี้' }),
]

router.get('/me', requireAuth, (req, res) => res.json(req.user))

export default router
