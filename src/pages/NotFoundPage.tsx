import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return <main className="game-placeholder"><h1>Page not found</h1><Link className="btn" to="/">Return home</Link></main>
}
