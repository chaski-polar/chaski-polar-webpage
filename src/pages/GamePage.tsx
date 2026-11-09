import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell'

export default function GamePage() {
  return <AppShell><main className="game-placeholder"><h1>Juego</h1><p>La migración del juego pixel está preparada como una feature independiente. Mientras tanto, el prototipo legacy sigue disponible.</p><a className="button-primary" href="/prototipos/cardumen/index.html">Probar prototipo Cardumen</a><a className="button-primary" href="/legacy/juego.html">Abrir prototipo legacy</a><Link className="button-primary" to="/">Volver al explorador</Link></main></AppShell>
}
