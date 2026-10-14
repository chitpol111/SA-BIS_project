import { authHeader } from './api'

// เปิดไฟล์แนบในแท็บใหม่ (ขอลิงก์ชั่วคราวจากเซิร์ฟเวอร์)
export async function openAttachment(path) {
  const tab = window.open('', '_blank') // เปิดแท็บก่อน กันถูกบล็อกป๊อปอัป
  try {
    const res = await fetch(`/api/leaves/attachment-url?path=${encodeURIComponent(path)}`, { headers: authHeader() })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.url) throw new Error(data.error || 'เปิดไฟล์ไม่สำเร็จ')
    if (tab) tab.location = data.url
    else window.location.href = data.url
  } catch (e) {
    tab?.close()
    alert(e.message)
  }
}
