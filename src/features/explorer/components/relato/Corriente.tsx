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
    <h2>Corriente de Humboldt</h2>
    <div className="region">Del sur de Chile al norte del Perú</div>
    <p>Lleva agua fría hacia el norte, pegada a la costa. Junto con el viento, que empuja el agua de la superficie mar adentro, hace subir agua profunda, fría y llena de nutrientes. A eso se le llama <strong>afloramiento</strong>, y por eso el mar peruano es uno de los más productivos del planeta.</p>
    <p>Cuando llega El Niño, el agua cálida tapa ese afloramiento: hay menos nutrientes, menos fitoplancton y menos anchoveta.</p>
    <h3>¿Qué quieres ver en el globo?</h3>
    <ChipsVariables zona={null} />
    <h3>Zonas a lo largo de la corriente</h3>
    <div className="chips">{modelo.ids.filter(esPeru).map((z) => <button key={z} className="chip" type="button" onClick={() => acciones.irAZona(z)}>{modelo.zona(z).nombre}</button>)}</div>
  </>
  return <>
    <BotonVolver />
    <h2>Corriente Circumpolar Antártica</h2>
    <div className="region">Alrededor de toda la Antártida</div>
    <p>Es la corriente más grande del mundo: gira de oeste a este alrededor de la Antártida, empujada por los vientos del oeste, y mantiene sus aguas frías separadas del resto. Frente al sur de Chile, parte de su agua se desvía hacia el norte y alimenta la corriente de Humboldt.</p>
    <p>Por eso la Antártida y el Perú están conectados por el océano. Pero el agua tarda meses o años en llegar y en el camino se mezcla. Los datos muestran que el fitoplancton de los dos lugares casi no cambia al mismo tiempo.</p>
    <h3>¿Qué quieres ver?</h3>
    <div className="chips">
      <button className="chip" type="button" onClick={() => acciones.irAZona('antartida_peninsula')}>La Península Antártica</button>
      <button className="chip" type="button" onClick={() => acciones.corriente('humboldt')}>La corriente de Humboldt</button>
      <button className="chip" type="button" onClick={acciones.base}>La Base Machu Picchu</button>
    </div>
  </>
}
