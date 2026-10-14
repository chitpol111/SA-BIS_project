import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import '../seed.js'
import { upsertUser } from '../db.js'

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'users.json')

try {
  const users = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(users)) throw new Error('users.json must contain an array')
  for (const user of users) await upsertUser(user)
  console.log(`ย้ายบัญชี ${users.length} รายการไป Supabase แล้ว`)
} catch (error) {
  console.error('ย้ายบัญชีไป Supabase ไม่สำเร็จ:', error.message)
  process.exitCode = 1
}
