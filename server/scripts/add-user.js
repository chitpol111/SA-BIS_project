// ใช้: node server/scripts/add-user.js <อีเมล> <รหัสผ่าน> "<ชื่อ>" <director|staff> [memberId]
import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const file = path.join(dir, 'users.json')
const [email, password, name, role, memberId] = process.argv.slice(2)

if (!email || !password || !name || !['director', 'staff'].includes(role)) {
  console.error('ใช้: node server/scripts/add-user.js <อีเมล> <รหัสผ่าน> "<ชื่อ>" <director|staff> [memberId]')
  process.exit(1)
}
if (password.length < 8) {
  console.error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
  process.exit(1)
}

fs.mkdirSync(dir, { recursive: true })
const users = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
const lower = email.trim().toLowerCase()
const record = {
  id: users.find((u) => u.email === lower)?.id ?? Math.max(0, ...users.map((u) => u.id)) + 1,
  email: lower,
  name,
  role,
  memberId: memberId ? Number(memberId) : null,
  passwordHash: bcrypt.hashSync(password, 10),
}
const i = users.findIndex((u) => u.email === lower)
if (i === -1) users.push(record)
else users[i] = record
fs.writeFileSync(file, JSON.stringify(users, null, 2), { mode: 0o600 })
console.log(`${i === -1 ? 'สร้าง' : 'อัปเดต'}บัญชี ${lower} (${role}) แล้ว`)
