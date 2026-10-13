import { useNavigate } from 'react-router-dom'
import { FiCalendar, FiMoreVertical, FiChevronDown, FiEdit2 } from 'react-icons/fi'
import { FaMapMarkerAlt } from 'react-icons/fa'
import { fmtDate } from '../date'
import './JobCard.css'

export const PROGRESS_LABEL = { notstarted: 'ยังไม่เริ่ม', progress: 'กำลังดำเนินการ', done: 'เสร็จสมบูรณ์' }

export default function JobCard({ job: j, onProgress }) {
  const navigate = useNavigate()
  return (
    <article className="job">
      <div className="job__line">
        <label>งาน</label>
        <span className="job__field">{j.title}</span>
        <span className="job__date"><FiCalendar /> {fmtDate(j.start)} - {fmtDate(j.end)}</span>
        <button className="job__kebab" aria-label="ตัวเลือก"><FiMoreVertical /></button>
      </div>

      <div className="job__line job__line--top">
        <label>สถานที่</label>
        <span className="job__addr">{j.address}</span>
        <a className="job__map" target="_blank" rel="noreferrer"
          href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(j.address)}>
          <FaMapMarkerAlt /> Open Google Map
        </a>
        <span className={'job__prio ' + (j.priority === 'ด่วนมาก' ? 'is-high' : 'is-normal')}>{j.priority}</span>
      </div>

      <div className="job__line job__line--end">
        <label>สถานะ</label>
        {j.progress === 'done' ? (
          <span className="job__done st--done">เสร็จแล้ว</span>
        ) : (
        <span className={'job__status st--' + j.progress}>
          <select value={j.progress} onChange={(e) => onProgress(j, e.target.value)}>
            {Object.entries(PROGRESS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <FiChevronDown />
        </span>
        )}
        <span className="job__btns">
        <button className="job__detail" onClick={() => navigate(`/work/${j.id}`)}>รายละเอียด</button>
        {j.progress === 'done' && (
          <button className="job__edit" onClick={() => navigate(`/work/${j.id}`)}><FiEdit2 /> แก้ไข</button>
        )}
        </span>
      </div>

      {j.substituteFor && <p className="job__for">รับผิดชอบแทน {j.substituteFor}</p>}
    </article>
  )
}
