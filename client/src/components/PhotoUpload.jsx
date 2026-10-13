import { useRef, useState } from 'react'
import { FiImage, FiUploadCloud, FiTrash2, FiRefreshCw } from 'react-icons/fi'
import './PhotoUpload.css'

const MAX_MB = 5
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function PhotoUpload({ value, onUpload, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file) {
    if (!file) return
    setError('')
    if (!OK_TYPES.includes(file.type)) return setError('รองรับเฉพาะ JPG, PNG, WebP')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`ไฟล์ใหญ่เกิน ${MAX_MB}MB`)
    setBusy(true)
    try {
      await onUpload(file)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const pick = () => inputRef.current?.click()

  return (
    <div className="photo">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
        onChange={(e) => handleFile(e.target.files?.[0])} />

      {value ? (
        <div className="photo__box photo__box--filled">
          <img src={value} alt="รูปประกอบงาน" />
          <div className="photo__actions">
            <button type="button" onClick={pick} disabled={busy}><FiRefreshCw /> เปลี่ยนรูป</button>
            <button type="button" onClick={onRemove} disabled={busy} className="is-danger"><FiTrash2 /> ลบ</button>
          </div>
        </div>
      ) : (
        <button type="button"
          className={'photo__box photo__box--empty' + (dragging ? ' is-drag' : '')}
          onClick={pick} disabled={busy}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }}>
          {busy ? <FiUploadCloud className="spin" /> : <FiImage />}
          <strong>{busy ? 'กำลังอัปโหลด...' : 'เพิ่มรูปภาพ'}</strong>
          <small>คลิกหรือลากรูปมาวางที่นี่<br />JPG, PNG, WebP ไม่เกิน {MAX_MB}MB</small>
        </button>
      )}

      {error && <p className="photo__error">{error}</p>}
    </div>
  )
}
