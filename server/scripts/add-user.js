// ใช้: node server/scripts/add-user.js <อีเมล> <รหัสผ่าน> "<ชื่อ>" <director|staff> [memberId]
import bcrypt from 'bcryptjs'
import '../seed.js'
import { upsertUser } from '../db.js'

const [email, password, name, role, memberId] = process.argv.slice(2)

if (!email || !password || !name || !['director', 'staff'].includes(role)) {
  console.error('ใช้: node server/scripts/add-user.js <อีเมล> <รหัสผ่าน> "<ชื่อ>" <director|staff> [memberId]')
  process.exit(1)
}
if (password.length < 8) {
  console.error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
  process.exit(1)
}

const lower = email.trim().toLowerCase()
const user = {
  id: 0,
  email: lower,
  name,
  role,
  memberId: memberId ? Number(memberId) : null,
  passwordHash: bcrypt.hashSync(password, 10),
}

try {
  const result = await upsertUser(user)
  console.log(`${result === 'created' ? 'สร้าง' : 'อัปเดต'}บัญชี ${lower} (${role}) แล้ว`)
} catch (error) {
  console.error('บันทึกบัญชีลง Supabase ไม่สำเร็จ:', error.message)
  process.exitCode = 1
}
