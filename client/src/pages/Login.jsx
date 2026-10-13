import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUser, FaLock, FaUserCircle, FaCog, FaArrowRight } from 'react-icons/fa'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ')

      const store = remember ? localStorage : sessionStorage
      store.setItem('token', data.token)
      store.setItem('user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      {/* ฝั่งซ้าย */}
      <section className="login__brand">
        <span className="login__circle login__circle--top" />
        <span className="login__circle login__circle--left" />
        <FaCog className="login__gear login__gear--top" />
        <FaCog className="login__gear login__gear--b1" />
        <FaCog className="login__gear login__gear--b2" />

        <div className="login__brand-body">
          {/* แทนที่ด้วยโลโก้จาก Figma: import logo from '../assets/logo.svg' */}
          <div className="login__logo"><FaUserCircle /></div>
          <h2 className="login__sys">ENGINEERING SYS</h2>
          <p className="login__sub">
            ระบบบริหารจัดการกองช่าง<br />
            องค์การบริหารส่วนตำบลพนมสารคาม
          </p>
        </div>
        <span className="login__version">เวอร์ชัน xxxx</span>
      </section>

      {/* ฝั่งขวา */}
      <section className="login__form-wrap">
        <FaCog className="login__gear login__gear--right" />
        <form className="login__form" onSubmit={onSubmit}>
          <h1>ยินดีต้อนรับ</h1>
          <p className="login__hint">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>

          <label className="login__field">
            <span>อีเมล</span>
            <div className="login__input">
              <FaUser />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="username" required />
            </div>
          </label>

          <label className="login__field">
            <span>รหัสผ่าน</span>
            <div className="login__input">
              <FaLock />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required />
            </div>
          </label>

          <div className="login__row">
            <label className="login__check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>จดจำฉันไว้</span>
            </label>
            <a href="#" className="login__forgot">ลืมรหัสผ่าน?</a>
          </div>

          {error && <p className="login__error">{error}</p>}

          <button className="login__submit" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : <>เข้าสู่ระบบ <FaArrowRight /></>}
          </button>
        </form>
      </section>
    </div>
  )
}
