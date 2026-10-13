import { useEffect } from 'react'
import './ConfirmModal.css'

export default function ConfirmModal({
  title = 'ยืนยันการบันทึกหรือไม่',
  cancelText = 'ยกเลิก',
  confirmText = 'ยืนยันการบันทึก',
  loading = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="modal" onClick={onCancel}>
      <div className="modal__box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p>{title}</p>
        <div className="modal__btns">
          <button className="modal__cancel" onClick={onCancel} disabled={loading}>{cancelText}</button>
          <button className="modal__ok" onClick={onConfirm} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
