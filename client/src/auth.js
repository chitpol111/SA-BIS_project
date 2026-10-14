export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}
export function isAuthenticated() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const user = getUser()
  return Boolean(token && user && ['director', 'staff'].includes(user.role))
}
export const isDirector = () => getUser()?.role === 'director'

export const displayName = () => getUser()?.name || 'ผู้ใช้'
