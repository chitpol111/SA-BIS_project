import { useState } from 'react'
import './ContactForm.css'

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | ok | error

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setForm({ name: '', email: '', message: '' })
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="contact">
      <div className="container contact__inner">
        <h2>ติดต่อเรา</h2>
        <form onSubmit={onSubmit} className="contact__form">
          <input name="name" placeholder="ชื่อ" value={form.name} onChange={onChange} required />
          <input name="email" type="email" placeholder="อีเมล" value={form.email} onChange={onChange} required />
          <textarea name="message" rows="5" placeholder="ข้อความ" value={form.message} onChange={onChange} required />
          <button className="btn" disabled={status === 'sending'}>
            {status === 'sending' ? 'กำลังส่ง...' : 'ส่งข้อความ'}
          </button>
          {status === 'ok' && <p className="contact__ok">ส่งเรียบร้อยแล้ว ขอบคุณครับ/ค่ะ</p>}
          {status === 'error' && <p className="contact__err">เกิดข้อผิดพลาด ลองใหม่อีกครั้ง</p>}
        </form>
      </div>
    </section>
  )
}