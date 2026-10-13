import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <a href="/" className="header__logo">LOGO</a>
        <nav className="header__nav">
          <a href="#about">เกี่ยวกับ</a>
          <a href="#services">บริการ</a>
          <a href="#contact" className="btn">ติดต่อเรา</a>
        </nav>
      </div>
    </header>
  )
}