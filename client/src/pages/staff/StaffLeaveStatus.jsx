import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiHome, FiCheck, FiEdit2, FiClock } from 'react-icons/fi'
import ConfirmModal from '../../components/ConfirmModal'
import { authHeader } from '../../api'
import { fmtDate } from '../../date'
import { DURATION_LABEL } from '../../leaveLabels'
import './StaffLeave.css'

const days = (l) => Math.round((new Date(l.end) - new Date(l.start)) / 86400000) + 1
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : '')

export default function StaffLeaveStatus() {
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/leaves/mine', { headers: authHeader() })
      if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setList(await r.json())
    } catch (e) {
      setError(e.message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function cancel(l) {
    setBusy(true)
    const r = await fetch(`/api/leaves/${l.id}`, { method: 'DELETE', headers: authHeader() })
    if (!r.ok) setError((await r.json()).error || 'ยกเลิกไม่สำเร็จ')
    setBusy(false); setConfirmDel(false)
    load()
  }

  const head = (
    <div className="lf__head">
      <button onClick={() => navigate('/team')} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
      <h1>ติดตามสถานะ</h1>
      <button className="lf__home" onClick={() => navigate('/')} aria-label="หน้าแรก"><FiHome /></button>
    </div>
  )

  if (!list) return <div className="lf">{head}<p className="lf__sub">{error || 'กำลังโหลด...'}</p></div>
  if (!list.length) {
    return (
      <div className="lf">{head}
        <div className="lf__card lf__empty">
          <p>ยังไม่มีใบลา</p>
          <button className="lf__ok" onClick={() => navigate('/team/leave/new')}>ยื่นใบลา</button>
        </div>
      </div>
    )
  }

  const l = list[0] // ใบลาล่าสุด
  const st = l.status
  const banner = {
    pending: ['ส่งใบลาเรียบร้อยแล้ว', 'ระบบได้รับใบลาของคุณแล้ว และกำลังดำเนินการตรวจสอบ', 'is-ok'],
    approved: ['ใบลาได้รับการอนุมัติแล้ว', 'ผู้อำนวยการอนุมัติใบลาของคุณเรียบร้อย', 'is-ok'],
    rejected: ['ใบลาไม่ได้รับการอนุมัติ', 'กรุณาติดต่อผู้อำนวยการหรือยื่นใบลาใหม่', 'is-no'],
  }[st]

  return (
    <div className="lf">
      {head}
      <div className="lf__card">
        <div className={'lf__banner ' + banner[2]}>
          <FiCheck />
          <div><b>{banner[0]}</b><small>{banner[1]}</small></div>
        </div>
        {error && <p className="lf__err">{error}</p>}

        <div className="lf__cols">
          <section className="lf__panel">
            <h3>สถานะการดำเนินการ</h3>
            <ol className="tl">
              <li className="is-done"><i><FiCheck /></i><b>ส่งใบลาเรียบร้อย</b>
                <small>{l.createdAt ? `วันนี้ ${timeOf(l.createdAt)} น.` : 'ส่งแล้ว'}</small></li>
              <li className={st === 'pending' ? 'is-wait' : 'is-done'}>
                <i>{st === 'pending' ? <FiClock /> : <FiCheck />}</i><b>รอการตรวจสอบ</b>
                <small>{st === 'pending' ? 'กำลังดำเนินการ...' : 'ตรวจสอบแล้ว'}</small></li>
              <li className={st === 'pending' ? '' : st === 'approved' ? 'is-done' : 'is-no'}>
                <i><FiCheck /></i><b>{st === 'rejected' ? 'ไม่อนุมัติ' : 'อนุมัติ'}</b>
                <small>{st === 'pending' ? '--' : st === 'approved' ? 'อนุมัติแล้ว' : 'ไม่ได้รับอนุมัติ'}</small></li>
            </ol>
          </section>

          <section className="lf__panel lf__detail">
            <h3>รายละเอียดการลา</h3>
            <dl>
              <dt>ประเภทการลา</dt><dd>{l.type}</dd>
              <dt>วันที่เริ่มต้น</dt><dd>{fmtDate(l.start)}</dd>
              <dt>วันที่สิ้นสุด</dt><dd>{fmtDate(l.end)}</dd>
              <dt>จำนวน</dt><dd>{l.duration && l.duration !== 'multi' ? DURATION_LABEL[l.duration] : `${days(l)} วัน`}</dd>
              <dt>ผู้แทน</dt><dd>{l.substitute}</dd>
              <dt>ผู้อนุมัติ</dt><dd>{st === 'pending' ? 'รอการตรวจสอบ' : 'ผู้อำนวยการกองช่าง'}</dd>
            </dl>
            <div className="lf__btns lf__btns--split">
              <button className="lf__edit" disabled={st !== 'pending'}
                onClick={() => navigate('/team/leave/new', { state: { leave: l } })}><FiEdit2 /> แก้ไขใบลา</button>
              <button className="lf__del" disabled={st !== 'pending'} onClick={() => setConfirmDel(true)}>ยกเลิกการลา</button>
            </div>
          </section>
        </div>
      </div>

      {confirmDel && (
        <ConfirmModal title="ยืนยันการยกเลิกการลาหรือไม่" confirmText="ยกเลิกการลา" loading={busy}
          onCancel={() => setConfirmDel(false)} onConfirm={() => cancel(l)} />
      )}
    </div>
  )
}
