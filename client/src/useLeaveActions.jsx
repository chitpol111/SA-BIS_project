import { useState } from 'react'
import ConfirmModal from './components/ConfirmModal'
import { authHeader } from './api'

const TEXT = {
  approved: { title: 'ยืนยันการอนุมัติการลาหรือไม่', confirm: 'อนุมัติ' },
  rejected: { title: 'ยืนยันการไม่อนุมัติการลาหรือไม่', confirm: 'ไม่อนุมัติ' },
  pending: { title: 'ต้องการเปลี่ยนกลับเป็นรออนุมัติหรือไม่', confirm: 'เปลี่ยนสถานะ' },
}

// onDone: เรียกหลังบันทึกสำเร็จ (ใช้โหลดข้อมูลใหม่)
export default function useLeaveActions(onDone) {
  const [target, setTarget] = useState(null) // { leave, status }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/leaves/${target.leave.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status: target.status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ')
      setTarget(null)
      await onDone()
    } catch (e) {
      setError(e.message)
      setTarget(null)
    } finally {
      setSaving(false)
    }
  }

  const modal = target && (
    <ConfirmModal
      title={TEXT[target.status].title}
      confirmText={TEXT[target.status].confirm}
      loading={saving}
      onCancel={() => setTarget(null)}
      onConfirm={save}
    />
  )

  return { ask: (leave, status) => setTarget({ leave, status }), modal, error }
}
