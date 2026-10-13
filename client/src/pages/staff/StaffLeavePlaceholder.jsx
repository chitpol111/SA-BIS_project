import { useLocation, useNavigate } from 'react-router-dom'

export default function StaffLeavePlaceholder() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 965, margin: '0 auto' }}>
      <button onClick={() => navigate('/team')}>&lt; กลับ</button>
      <h1 style={{ color: '#1e1578' }}>{pathname.endsWith('/new') ? 'ยื่นใบลา' : 'ติดตามสถานะการลา'}</h1>
      <p style={{ color: '#666' }}>รอออกแบบ</p>
    </div>
  )
}
