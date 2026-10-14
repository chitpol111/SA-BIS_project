import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { persistRequestState } from './db.js'
import authRouter from './auth.js'
import dashboardRouter from './dashboard.js'
import workRouter from './work.js'
import teamRouter from './team.js'
import leaveRouter from './leave.js'
import calendarRouter from './calendar.js'
import myRouter from './my.js'
import chatRouter from './chat.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', persistRequestState)
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/work', workRouter)
app.use('/api/teams', teamRouter)
app.use('/api/leaves', leaveRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/my', myRouter)
app.use('/api/chat', chatRouter)

app.use((error, _req, res, next) => {
  console.error('API request failed:', error)
  if (res.headersSent) return next(error)
  res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง' })
})

const dist = path.join(__dirname, '..', 'client', 'dist')
if (!process.env.VERCEL && fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
}

export default app
