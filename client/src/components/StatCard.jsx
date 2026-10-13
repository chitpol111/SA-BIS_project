import './StatCard.css'

export default function StatCard({ value, label, color, active = false, onClick }) {
  return (
    <button type="button" className={'stat' + (active ? ' is-active' : '')} onClick={onClick}>
      <span className="stat__value" style={{ color }}>{value}</span>
      <span className="stat__label">{label}</span>
    </button>
  )
}
