import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import authRouter from './auth.js'
import dashboardRouter from './dashboard.js'
import workRouter, { UPLOAD_DIR } from './work.js'
import teamRouter from './team.js'
import leaveRouter from './leave.js'
import calendarRouter from './calendar.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/work', workRouter)
app.use('/api/teams', teamRouter)
app.use('/api/leaves', leaveRouter)
app.use('/api/calendar', calendarRouter)
app.use('/uploads', express.static(UPLOAD_DIR))

const dist = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
