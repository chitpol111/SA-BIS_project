import { useNavigate } from 'react-router-dom'
import { FiMoreVertical, FiUser } from 'react-icons/fi'
import './TeamFolder.css'

export default function TeamFolder({ team }) {
  const navigate = useNavigate()
  const shown = Math.min(3, team.memberCount)
  const rest = team.memberCount - shown

  return (
    <div
      className="folder"
      style={{ '--front': team.front, '--back': team.back }}
      role="link" tabIndex={0}
      onClick={() => navigate(`/team/${team.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/team/${team.id}`)}
    >
      <span className="folder__back" />
      <div className="folder__front">
        <button type="button" className="folder__menu" aria-label="ตัวเลือก"
          onClick={(e) => e.stopPropagation()}>
          <FiMoreVertical />
        </button>
        <h3>{team.name}</h3>
        <hr />
        <div className="folder__avatars">
          {Array.from({ length: shown }, (_, i) => (
            <span key={i} className="folder__avatar"><FiUser /></span>
          ))}
          {rest > 0 && <span className="folder__more">+{rest}</span>}
          {team.memberCount === 0 && <small>ยังไม่มีสมาชิก</small>}
        </div>
      </div>
    </div>
  )
}
