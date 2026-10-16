import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRightCircle, FiChevronRight, FiUser } from 'react-icons/fi'
import TeamFolder from '../../components/TeamFolder'
import { authHeader } from '../../api'
import { DEPT_COLORS } from '../../teamColors'
import '../Team.css'

export default function StaffTeam() {
  const [teams, setTeams] = useState([])
  const [people, setPeople] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const h = { headers: authHeader() }
    Promise.all([fetch('/api/teams', h), fetch('/api/teams/people', h)])
      .then(async (rs) => {
        if (rs.some((r) => !r.ok)) throw new Error('โหลดข้อมูลไม่สำเร็จ')
        const [t, p] = await Promise.all(rs.map((r) => r.json()))
        setTeams(t); setPeople(p)
      })
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="team">
      <div className="team__head">
        <h1>Team</h1>
        <Link to="/team/all" className="team__viewall">view all <FiArrowRightCircle /></Link>
      </div>

      {error && <p className="team__msg">{error}</p>}

      <div className="team__folders">
        {teams.slice(0, 3).map((t) => <TeamFolder key={t.id} team={t} />)}
      </div>

      <section className="leave">
        <h2>การลา</h2>
        <div className="leave__btns" style={{ position: 'absolute', top: 12, right: 18 }}>
          <Link to="/team/leave/mine">ติดตามสถานะ <FiChevronRight /></Link>
          <Link to="/team/leave/new">ยื่นใบลา <FiChevronRight /></Link>
        </div>
      </section>

      <section className="people">
        <h2>บุคลากร</h2>
        <div className="people__row people__row--head">
          <span /><span>ชื่อ</span><span>แผนก</span><span>ตำแหน่ง</span><span>งานที่รับ</span><span>สถานะ</span>
        </div>
        {people.map((p) => (
          <div key={p.id} className="people__row people__row--item">
            <span className="people__avatar"><FiUser /></span>
            <span className="people__name">{p.name}</span>
            <span><i className="dept" style={{ background: DEPT_COLORS[p.dept] || '#ddd' }}>▼ {p.dept}</i></span>
            <span className="people__pos">{p.position}</span>
            <span><i className="jobs">{p.jobs} งาน</i></span>
            <span>
              <i className={'state ' + (p.available ? 'state--free' : 'state--can')}>
                {p.available ? 'พร้อมรับงาน' : 'รับงานได้'}
              </i>
            </span>
          </div>
        ))}
        {!people.length && !error && <p className="team__msg">ยังไม่มีบุคลากร</p>}
      </section>
    </div>
  )
}
