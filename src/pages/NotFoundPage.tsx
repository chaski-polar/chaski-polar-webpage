import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return <main className="game-placeholder"><h1>Página no encontrada</h1><Link className="btn" to="/">Volver al explorador</Link></main>
}
