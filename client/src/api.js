export function authHeader() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { Authorization: 'Bearer ' + t }
}
