import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { registerCollection } from './db.js'
export const ROLES = ['director', 'staff']
const users = registerCollection('users')
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, memberId: u.memberId ?? null })
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10)

const router = Router()

router.post('/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const secret = process.env.JWT_SECRET
  if (!secret || Buffer.byteLength(secret) < 32) {
    return res.status(503).json({ error: 'ระบบยืนยันตัวตนยังตั้งค่าไม่ครบ' })
  }
  const user = users.find((u) => u.email.toLowerCase() === email)
  const ok = bcrypt.compareSync(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok) return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })

  const token = jwt.sign({ id: user.id }, secret, { expiresIn: '8h' })
  res.json({ token, user: publicUser(user) })
})

// ตรวจ token และอ่าน role ล่าสุดจากฐานข้อมูลทุกครั้ง
export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const secret = process.env.JWT_SECRET
  if (!secret || Buffer.byteLength(secret) < 32) {
    return res.status(503).json({ error: 'ระบบยืนยันตัวตนยังตั้งค่าไม่ครบ' })
  }
  try {
    const { id } = jwt.verify(token, secret)
    const user = users.find((u) => u.id === id)
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
