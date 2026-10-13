import './StatusBadge.css'

const map = {
  'รอดำเนินการ': 'pending',
  'รอมอบหมาย': 'pending',
  'มอบหมายแล้ว': 'assigned',
  'กำลังดำเนินการ': 'progress',
  'เสร็จสมบูรณ์': 'done',
  'เลยกำหนด': 'overdue',
  'รออนุมัติ': 'pending',
  'อนุมัติ': 'done',
  'ไม่อนุมัติ': 'overdue',
}

export default function StatusBadge({ children }) {
  return <span className={'badge badge--' + (map[children] || 'pending')}>{children}</span>
}
