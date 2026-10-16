import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import { getUser, isAuthenticated } from './auth'
import Login from './pages/Login'
import Home from './pages/Home'
import Work from './pages/Work'
import WorkDetail from './pages/WorkDetail'
import Team from './pages/Team'
import TeamAll from './pages/TeamAll'
import TeamMember from './pages/TeamMember'
import TeamLeave from './pages/TeamLeave'
import TeamLeaveAccept from './pages/TeamLeaveAccept'
import LeaveDetail from './pages/LeaveDetail'
import Calendar from './pages/Calendar'
import StaffHome from './pages/staff/StaffHome'
import StaffWork from './pages/staff/StaffWork'
import StaffWorkDetail from './pages/staff/StaffWorkDetail'
import StaffTeam from './pages/staff/StaffTeam'
import StaffTeamAll from './pages/staff/StaffTeamAll'
import StaffTeamMember from './pages/staff/StaffTeamMember'
import StaffLeaveForm from './pages/staff/StaffLeaveForm'
import StaffLeaveStatus from './pages/staff/StaffLeaveStatus'

// เมนูเดียวกัน แต่เลือกหน้าตาม role
function ByRole({ director, staff }) {
  return getUser()?.role === 'director' ? director : staff
}
// หน้าที่ ผอ. เท่านั้นเข้าได้ (เจ้าหน้าที่ถูกส่งกลับหน้าแรก)
function DirectorOnly({ children }) {
  return getUser()?.role === 'director' ? children : <Navigate to="/" replace />
}

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/" element={<ByRole director={<Home />} staff={<StaffHome />} />} />
          <Route path="/work" element={<ByRole director={<Work />} staff={<StaffWork />} />} />
          <Route path="/work/new" element={<DirectorOnly><WorkDetail /></DirectorOnly>} />
          <Route path="/work/:id" element={<ByRole director={<WorkDetail />} staff={<StaffWorkDetail />} />} />
          <Route path="/team" element={<ByRole director={<Team />} staff={<StaffTeam />} />} />
          <Route path="/team/all" element={<ByRole director={<TeamAll />} staff={<StaffTeamAll />} />} />
          <Route path="/team/leave" element={<DirectorOnly><TeamLeave /></DirectorOnly>} />
          <Route path="/team/leave/accept" element={<DirectorOnly><TeamLeaveAccept /></DirectorOnly>} />
          <Route path="/team/leave/detail/:id" element={<DirectorOnly><LeaveDetail /></DirectorOnly>} />
          <Route path="/team/leave/mine" element={<StaffLeaveStatus />} />
          <Route path="/team/leave/new" element={<StaffLeaveForm />} />
          <Route path="/team/:id" element={<ByRole director={<TeamMember />} staff={<StaffTeamMember />} />} />
          <Route path="/calendar" element={<ByRole director={<Calendar />} staff={<Calendar />} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
