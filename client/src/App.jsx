import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Home from './pages/Home'
import Work from './pages/Work'
import WorkDetail from './pages/WorkDetail'
import Team from './pages/Team'
import TeamAll from './pages/TeamAll'
import TeamMember from './pages/TeamMember'
import TeamLeave from './pages/TeamLeave'
import TeamLeaveAccept from './pages/TeamLeaveAccept'
import Calendar from './pages/Calendar'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/work" element={<Work />} />
          <Route path="/work/:id" element={<WorkDetail />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/all" element={<TeamAll />} />
          <Route path="/team/leave" element={<TeamLeave />} />
          <Route path="/team/leave/accept" element={<TeamLeaveAccept />} />
          <Route path="/team/:id" element={<TeamMember />} />
          <Route path="/calendar" element={<Calendar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}