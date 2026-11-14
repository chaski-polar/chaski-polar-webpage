import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import type { IdCorriente } from '../../lib/estado'
import { esPeru } from '../../lib/modelo'
import { BotonVolver, ChipsVariables } from './comun'

/** Corriente de Humboldt o Circumpolar Antártica */
export default function Corriente({ id }: { id: IdCorriente }) {
  const { modelo } = useExplorer()
  const acciones = useAcciones()
  if (id === 'humboldt') return <>
    <BotonVolver />
    <h2>Humboldt Current</h2>
    <div className="region">From southern Chile to northern Peru</div>
    <p>It carries cold water north along the coast. Together with the wind, which pushes surface water offshore, it brings deep, cold, nutrient-rich water to the surface. This is called <strong>upwelling</strong>, and it makes the Peruvian sea one of the most productive in the world.</p>
    <p>When El Niño arrives, warm water caps that upwelling: there are fewer nutrients, less phytoplankton and fewer anchoveta.</p>
    <h3>What would you like to see on the globe?</h3>
    <ChipsVariables zona={null} />
    <h3>Zones along the current</h3>
    <div className="chips">{modelo.ids.filter(esPeru).map((z) => <button key={z} className="chip" type="button" onClick={() => acciones.irAZona(z)}>{modelo.zona(z).nombre}</button>)}</div>
  </>
  return <>
    <BotonVolver />
    <h2>Antarctic Circumpolar Current</h2>
    <div className="region">Around Antarctica</div>
    <p>It is the world's largest current: it flows west to east around Antarctica, pushed by westerly winds, keeping its cold waters separate from the rest. Off southern Chile, some of its water turns north and feeds the Humboldt Current.</p>
    <p>That is why Antarctica and Peru are connected by the ocean. But the water takes months or years to arrive and mixes along the way. More than 1,100 tests found no robust relationship between the Southern Ocean and Peruvian phytoplankton after controlling for El Niño.</p>
    <h3>What would you like to explore?</h3>
    <div className="chips">
      <button className="chip" type="button" onClick={() => acciones.irAZona('antartida_peninsula')}>Antarctic Peninsula</button>
      <button className="chip" type="button" onClick={() => acciones.corriente('humboldt')}>Humboldt Current</button>
      <button className="chip" type="button" onClick={acciones.base}>Machu Picchu Base</button>
    </div>
  </>
}
