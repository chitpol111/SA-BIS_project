import { FiX, FiCheck, FiEdit2 } from 'react-icons/fi'
import './LeaveActions.css'

export default function LeaveActions({ leave, onAsk }) {
  if (leave.status === 'pending') {
    return (
      <span className="lva">
        <button type="button" className="lva__no" aria-label="ไม่อนุมัติ" onClick={() => onAsk(leave, 'rejected')}><FiX /></button>
        <button type="button" className="lva__ok" aria-label="อนุมัติ" onClick={() => onAsk(leave, 'approved')}><FiCheck /></button>
      </span>
    )
  }
  return (
    <span className="lva">
      <button type="button" className="lva__edit" aria-label="แก้ไขสถานะ" onClick={() => onAsk(leave, 'pending')}><FiEdit2 /></button>
    </span>
  )
}
