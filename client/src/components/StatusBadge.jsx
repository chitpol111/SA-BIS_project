import './StatusBadge.css'

const map = {
  'รอดำเนินการ': 'pending',
  'กำลังดำเนินการ': 'progress',
  'เสร็จสมบูรณ์': 'done',
}

export default function StatusBadge({ children }) {
  return <span className={'badge badge--' + (map[children] || 'pending')}>{children}</span>
}
