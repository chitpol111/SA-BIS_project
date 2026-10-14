import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiChevronLeft, FiCalendar, FiClock, FiCheck, FiX, FiEdit2, FiPaperclip, FiUser } from 'react-icons/fi'
import StatusBadge from '../components/StatusBadge'
import useLeaveActions from '../useLeaveActions'
import { authHeader } from '../api'
import { fmtDate } from '../date'
import { openAttachment } from '../openAttachment'
import { STATUS_LABEL, DURATION_LABEL } from '../leaveLabels'
import './LeaveDetail.css'

const PREFIX = [['นางสาว', 'น.ส.'], ['นาง', 'นาง'], ['นาย', 'นาย']]
function initials(name = '') {
  const hit = PREFIX.find(([p]) => name.startsWith(p))
  const rest = hit ? name.slice(hit[0].length).trim() : name.trim()
  return (hit ? hit[1] : '') + (rest[0] ?? '') + (hit ? '.' : '')
}

function fmtDateTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' })
}

export default function LeaveDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [leave, setLeave] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/leaves/${id}`, { headers: authHeader() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ')
      setLeave(data)
    } catch (e) {
      setError(e.message)
    }
  }, [id])

  useEffect(() => { load() }, [load])
  const { ask, modal, error: actError } = useLeaveActions(load)

  const back = () => navigate('/team/leave/accept')
  if (error) return <p className="ld__msg">{error}</p>
  if (!leave) return <p className="ld__msg">กำลังโหลด...</p>

  const st = leave.status
  const sameDay = leave.start === leave.end
  const steps = [
    { icon: <FiCalendar />, title: 'ส่งคำขอ', sub: fmtDateTime(leave.createdAt), state: 'done' },
    {
      icon: <FiClock />,
      title: st === 'pending' ? 'รอผู้อำนวยการ' : 'ผู้อำนวยการตรวจสอบแล้ว',
      sub: st === 'pending' ? 'กำลังตรวจสอบ' : 'ตรวจสอบเรียบร้อย',
      state: st === 'pending' ? 'current' : 'done',
    },
    {
      icon: st === 'rejected' ? <FiX /> : <FiCheck />,
      title: st === 'rejected' ? 'ไม่อนุมัติ' : 'อนุมัติสำเร็จ',
      sub: st === 'pending' ? '- - -' : STATUS_LABEL[st],
      state: st === 'pending' ? 'wait' : st === 'rejected' ? 'bad' : 'done',
    },
  ]

  return (
    <div className="ld">
      <div className="ld__page-head">
        <button onClick={back} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>รายละเอียด</h1>
      </div>

      <div className="ld__card">
        <div className="ld__head">
          <button className="ld__back" onClick={back} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
          <h2>รายละเอียดการลา</h2>
          <StatusBadge>{STATUS_LABEL[st]}</StatusBadge>
        </div>

        <div className="ld__grid">
          <div className="ld__main">
            <section className="ld__box ld__box--gray">
              <h3>ข้อมูลผู้ขอ</h3>
              <div className="ld__person">
                <span className="ld__avatar">{initials(leave.requester.name)}</span>
                <div>
                  <strong>{leave.requester.name}</strong>
                  <p>แผนก{leave.requester.dept}</p>
                  <p>ตำแหน่ง {leave.requester.position}</p>
                </div>
              </div>
            </section>

            <section className="ld__box">
              <h3>รายละเอียดการลา</h3>
              <dl className="ld__dl">
                <div><dt>ประเภทการลา</dt><dd>{leave.type}</dd></div>
                <div>
                  <dt>วันที่ลา</dt>
                  <dd>{sameDay ? fmtDate(leave.start) : `${fmtDate(leave.start)} - ${fmtDate(leave.end)}`}</dd>
                </div>
                <div><dt>ระยะเวลาลา</dt><dd>{DURATION_LABEL[leave.duration] ?? '-'}</dd></div>
                <div><dt>สาเหตุการลา</dt><dd>{leave.note || '-'}</dd></div>
                <div className="ld__wide">
                  <dt>เอกสารประกอบ</dt>
                  <dd className="ld__files">
                    {leave.attachments?.length
                      ? leave.attachments.map((a) => (
                          <button key={a.path} type="button" onClick={() => openAttachment(a.path)}>
                            <FiPaperclip /> {a.name}
                          </button>
                        ))
                      : 'ไม่มีเอกสารแนบ'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="ld__box">
              <h3>ผู้รับผิดชอบแทน</h3>
              <div className="ld__sub"><span><FiUser /></span>{leave.substitute}</div>
            </section>
          </div>

          <aside className="ld__side">
            <section className="ld__box">
              <h3>ประวัติการอนุมัติ</h3>
              <ol className="ld__steps">
                {steps.map((s) => (
                  <li key={s.title} className={'is-' + s.state}>
                    <span className="ld__ico">{s.icon}</span>
                    <div><strong>{s.title}</strong><small>{s.sub}</small></div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="ld__box ld__box--gray ld__hint">
              <h4>หมายเหตุ</h4>
              <p>หากอนุมัติ ระบบจะแจ้งเตือนไปยังผู้ขอและบันทึกการลาในระบบอัตโนมัติ</p>
            </section>
          </aside>
        </div>

        {actError && <p className="ld__err">{actError}</p>}
        <div className="ld__bar">
          {st === 'pending' ? (
            <>
              <button className="ld__no" onClick={() => ask(leave, 'rejected')}><FiX /> ไม่อนุมัติ</button>
              <button className="ld__ok" onClick={() => ask(leave, 'approved')}><FiCheck /> อนุมัติ</button>
            </>
          ) : (
            <button className="ld__edit" onClick={() => ask(leave, 'pending')}><FiEdit2 /> แก้ไขสถานะ</button>
          )}
        </div>
      </div>

      {modal}
    </div>
  )
}
