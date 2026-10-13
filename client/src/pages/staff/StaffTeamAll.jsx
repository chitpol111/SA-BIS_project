import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiArrowLeftCircle } from 'react-icons/fi'
import TeamFolder from '../../components/TeamFolder'
import { authHeader } from '../../api'
import '../TeamAll.css'

export default function StaffTeamAll() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/teams', { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('โหลดข้อมูลไม่สำเร็จ'))))
      .then(setTeams)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="ta">
      <div className="ta__head">
        <button className="ta__back" onClick={() => navigate('/team')} aria-label="ย้อนกลับ"><FiChevronLeft /></button>
        <h1>All Team</h1>
        <Link to="/team" className="ta__backlink">Back <FiArrowLeftCircle /></Link>
      </div>
      {error && <p className="ta__msg">{error}</p>}
      <div className="ta__grid">
        {teams.map((t) => <TeamFolder key={t.id} team={t} />)}
      </div>
    </div>
  )
}
