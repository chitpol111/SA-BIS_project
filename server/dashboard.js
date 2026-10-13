import { Router } from 'express'
import { requireAuth } from './auth.js'

const router = Router()

router.get('/', requireAuth, (_req, res) => {
  res.json({
    stats: { total: 128, pending: 24, inProgress: 18, done: 86 },
    teamWork: [
      { name: 'ไฟฟ้า', value: 15 },
      { name: 'โยธา', value: 9 },
      { name: 'เขียนแบบ', value: 1 },
      { name: 'สำรวจ', value: 14 },
      { name: 'ประปา', value: 1.5 },
      { name: 'สวนสาธารณะ', value: 5 },
      { name: 'ธุรการ', value: 9 },
    ],
    monthly: [14, 8, 1, 3, 8, 5, 7.5, 8, 4, 18, 4, 17.5, 9].map((v, i) => ({ month: i, value: v })),
    urgent: [
      { id: 1, title: 'ซ่อมเสาไฟฟ้า', team: 'ไฟฟ้า', due: '10 Oct 2026', owner: 'นางสาวชานม ไข่มุก', status: 'รอดำเนินการ' },
      { id: 2, title: 'ซ่อมเสาไฟฟ้า', team: 'ไฟฟ้า', due: '11 Oct 2026', owner: 'นายชาไทย วิปครีม', status: 'รอดำเนินการ' },
      { id: 3, title: 'ซ่อมเสาไฟฟ้า', team: 'ไฟฟ้า', due: '12 Oct 2026', owner: 'นายโกโก้ คมเข้ม', status: 'รอดำเนินการ' },
      { id: 4, title: 'ซ่อมเสาไฟฟ้า', team: 'ไฟฟ้า', due: '13 Oct 2026', owner: 'นางสาวมัตจะ ลาเต้', status: 'รอดำเนินการ' },
      { id: 5, title: 'ซ่อมเสาไฟฟ้า', team: 'ไฟฟ้า', due: '13 Oct 2026', owner: 'นางสาวอเมริกาโน คาปูชิโน', status: 'รอดำเนินการ' },
    ],
  })
})

export default router
