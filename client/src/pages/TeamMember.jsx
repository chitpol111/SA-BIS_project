import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PieChart, Pie, Cell } from 'recharts'
import { FiChevronLeft, FiUser, FiMoreVertical, FiCalendar, FiChevronRight, FiCheckCircle } from 'react-icons/fi'
import { FaWhatsapp, FaFacebook, FaLine } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import StatusBadge from '../components/StatusBadge'
import { authHeader } from '../api'
import { DEPT_COLORS } from '../teamColors'
import { fmtDate, tenure } from '../date'
import './TeamMember.css'

const FILTERS = [
  ['all', 'ทั้งหมด'],
  ['done', 'เสร็จแล้ว'],
  ['progress', 'กำลังดำเนินการ'],
  ['overdue', 'เลยกำหนด'],
]
// ชื่อสถานะที่แสดงในตาราง (ตรงกับ Figma: งานที่กำลังทำแสดงเป็น "รอดำเนินการ")
const LABEL = { done: 'เสร็จสมบูรณ์', progress: 'รอดำเนินการ', overdue: 'เลยกำหนด' }

export default function TeamMember() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [sel, setSel] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setData(null); setError('')
    fetch(`/api/teams/${id}`, { headers: authHeader() })
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'ไม่พบทีมนี้' : 'โหลดข้อมูลไม่สำเร็จ'))
      )
      .then((d) => { setData(d); setSel(d.members[0]?.id ?? null) })
      .catch((e) => setError(e.message))
  }, [id])

  useEffect(() => { setFilter('all') }, [sel])

  if (error) return <p className="tmb__msg">{error}</p>
  if (!data) return <p className="tmb__msg">กำลังโหลด...</p>

  const { team, members } = data
  const m = members.find((x) => x.id === sel)

  const head = (
    <div className="tmb__head">
      <button onClick={() => navigate('/team')} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
      <h1>{team.name}</h1>
    </div>
  )

  if (!m) {
    return (
      <div className="tmb">
        {head}
        <p className="tmb__msg">ยังไม่มีสมาชิกในทีมนี้</p>
      </div>
    )
  }

  const count = (s) => m.jobs.filter((j) => j.status === s).length
  const rows = filter === 'all' ? m.jobs : m.jobs.filter((j) => j.status === filter)
  const stats = [
    ['งานที่ได้รับทั้งหมด', m.jobs.length],
    ['เสร็จแล้ว', count('done')],
    ['กำลังดำเนินการ', count('progress')],
    ['เกินกำหนด', count('overdue')],
  ]
  const color = m.workload >= 85 ? '#ef4444' : m.available ? '#22c55e' : '#f59e0b'
  const c = m.contacts

  return (
    <div className="tmb">
      {head}

      <div className="tmb__tabs">
        {members.map((x) => (
          <button key={x.id} className={x.id === sel ? 'is-on' : ''} onClick={() => setSel(x.id)}>
            <span className="tmb__ava"><FiUser /></span>
            <span>{x.name}</span>
          </button>
        ))}
      </div>

      <div className="tmb__grid">
        <div className="tmb__main">
          <div className="tmb__stats">
            {stats.map(([label, n]) => (
              <div key={label} className="tmb__stat">
                <span>{label}</span>
                <strong>{n}</strong>
                <small>งาน</small>
              </div>
            ))}
          </div>

          <section className="tmb__panel">
            <h2>งานปัจจุบัน</h2>
            <div className="tmb__chips">
              {FILTERS.map(([k, label]) => (
                <button key={k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>{label}</button>
              ))}
            </div>
            <div className="tmb__scroll">
              <div className="tmb__row tmb__row--head tmb__row--jobs">
                <span>ลำดับ</span><span>เรื่อง</span><span>ประเภท</span><span>ระยะเวลา</span><span>สถานะ</span><span />
              </div>
              {rows.map((j, i) => (
                <div key={j.id} className="tmb__row tmb__row--item tmb__row--jobs">
                  <span>{i + 1}</span>
                  <span>{j.title}</span>
                  <span><i className="tmb__tag" style={{ background: DEPT_COLORS[j.type] || '#ddd' }}>▼ {j.type}</i></span>
                  <span><i className="tmb__date"><FiCalendar /> {fmtDate(j.start)} - {fmtDate(j.end)}</i></span>
                  <span><StatusBadge>{LABEL[j.status]}</StatusBadge></span>
                  <span><FiChevronRight /></span>
                </div>
              ))}
              {!rows.length && <p className="tmb__empty">ไม่มีงานในหมวดนี้</p>}
            </div>
          </section>

          <section className="tmb__panel">
            <h2>ประวัติงาน</h2>
            <div className="tmb__scroll">
              <div className="tmb__row tmb__row--head tmb__row--hist">
                <span>วันที่</span><span>เรื่อง</span><span>สถานะ</span><span>ผลการดำเนินงาน</span>
              </div>
              {m.history.map((h, i) => (
                <div key={i} className="tmb__row tmb__row--item tmb__row--hist">
                  <span>{fmtDate(h.date)}</span>
                  <span>{h.title}</span>
                  <span><StatusBadge>เสร็จสมบูรณ์</StatusBadge></span>
                  <span>{h.result}</span>
                </div>
              ))}
              {!m.history.length && <p className="tmb__empty">ยังไม่มีประวัติงาน</p>}
            </div>
          </section>
        </div>

        <aside className="tmb__side">
          <section className="tmb__card tmb__profile">
            <div className="tmb__onduty"><i /> กำลังปฏิบัติงาน</div>
            <button className="tmb__kebab" aria-label="ตัวเลือก"><FiMoreVertical /></button>
            <div className="tmb__photo"><FiUser /></div>
            <h3>{m.name}</h3>
            <span className="tmb__pos">{m.position}</span>
            <p>แผนก {m.dept}</p>
            <div className="tmb__contacts">
              <a href={`https://wa.me/66${c.phone.slice(1)}`} target="_blank" rel="noreferrer"
                title={c.phone} style={{ color: '#25d366' }}><FaWhatsapp /></a>
              <a href={`mailto:${c.email}`} title={c.email} style={{ color: '#ea4335' }}><SiGmail /></a>
              <a href={c.facebook || undefined} target="_blank" rel="noreferrer"
                className={c.facebook ? '' : 'is-off'} title="Facebook" style={{ color: '#1877f2' }}><FaFacebook /></a>
              <a href={c.line || undefined} target="_blank" rel="noreferrer"
                className={c.line ? '' : 'is-off'} title="Line" style={{ color: '#06c755' }}><FaLine /></a>
            </div>
          </section>

          <section className="tmb__card tmb__overview">
            <div className="tmb__pill">ภาพรวมการทำงาน</div>
            <div className="tmb__info">
              <div><FiCalendar /><small>วันที่เริ่มงาน</small><b>{fmtDate(m.startDate)}</b></div>
              <div><FiUser /><small>อายุงาน</small><b>{tenure(m.startDate)}</b></div>
            </div>

            <div className="tmb__load">
              <small>ภาระงานโดยรวม</small>
              <div className="tmb__loadbody">
                <div className="tmb__donut">
                  <PieChart width={84} height={84}>
                    <Pie data={[{ v: m.workload }, { v: 100 - m.workload }]} dataKey="v"
                      innerRadius={26} outerRadius={38} startAngle={90} endAngle={-270} stroke="none">
                      <Cell fill={color} /><Cell fill="#dcdcdc" />
                    </Pie>
                  </PieChart>
                  <span>{m.workload}%</span>
                </div>
                <div className="tmb__cap">
                  <b>ความสามารถในการรับงาน</b>
                  <small>จากการดำเนินงาน {m.capacity} งาน/เดือน</small>
                </div>
              </div>
            </div>

            <div className="tmb__ready">
              <span className="tmb__pill tmb__pill--sm">ความพร้อมรับงาน</span>
              <span className={'tmb__pill tmb__pill--sm ' + (m.available ? 'is-free' : 'is-can')}>
                {m.available && <FiCheckCircle />} {m.available ? 'พร้อมรับงาน' : 'รับงานได้'}
              </span>
            </div>
            <small className="tmb__hint">พร้อมรับงาน = ภาระงานต่ำกว่า 30% และไม่มีงานเกินกำหนด</small>
          </section>
        </aside>
      </div>
    </div>
  )
}
