import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const router = Router()
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

// ผู้ใช้ตัวอย่าง (ภายหลังย้ายไปฐานข้อมูล)
const users = [
  {
    id: 1,
    email: 'admin@demo.com',
    name: 'Admin',
    role: 'admin',
    passwordHash: bcrypt.hashSync('password123', 10),
  },
]

router.post('/login', (req, res) => {
  const { email, password } = req.body ?? {}
  const user = users.find((u) => u.email === email)
  if (!user || !bcrypt.compareSync(String(password ?? ''), user.passwordHash)) {
    return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  }
  const payload = { id: user.id, email: user.email, name: user.name, role: user.role }
  const token = jwt.sign(payload, SECRET, { expiresIn: '8h' })
  res.json({ token, user: payload })
})

// middleware ใช้ป้องกัน API อื่นภายหลัง
export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' })
  }
}

export default router
