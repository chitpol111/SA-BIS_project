const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// '2026-10-06' -> '6 Oct 2026'
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// '2024-05-02' -> '2 ปี 5 เดือน'
export function tenure(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const now = new Date()
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < d) months -= 1
  months = Math.max(0, months)
  const yy = Math.floor(months / 12)
  const mm = months % 12
  return [yy && `${yy} ปี`, mm && `${mm} เดือน`].filter(Boolean).join(' ') || 'ไม่ถึง 1 เดือน'
}

// ---------- ใช้กับปฏิทิน ----------
export const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n) => String(n).padStart(2, '0')
const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
export const toISO = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
export function addDays(iso, n) {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000)
export const weekdayIndex = (iso) => parseISO(iso).getUTCDay()
export const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

// ช่องวันที่ของเดือน (null = ช่องว่างก่อนวันที่ 1)
export function monthGrid(y, m) {
  const lead = new Date(Date.UTC(y, m, 1)).getUTCDay()
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return [
    ...Array(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${y}-${pad(m + 1)}-${pad(i + 1)}`),
  ]
}
