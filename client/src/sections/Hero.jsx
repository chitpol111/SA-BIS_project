import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero__inner">
        <div>
          <h1>หัวข้อหลักจาก Figma</h1>
          <p>คำอธิบายสั้น ๆ ใต้หัวข้อ</p>
          <a href="#contact" className="btn">เริ่มต้นเลย</a>
        </div>
        {/* export รูปจาก Figma ไปไว้ที่ src/assets/hero.png */}
        {/* <img src={heroImg} alt="" /> */}
      </div>
    </section>
  )
}