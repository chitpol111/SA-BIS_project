export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}
export const isDirector = () => getUser()?.role === 'director'

export const displayName = () => getUser()?.name || 'ผู้ใช้'
