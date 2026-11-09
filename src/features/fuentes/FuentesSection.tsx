import type { ReactNode } from 'react'

type Fuente = { dato: string; nasa?: string; fuente: ReactNode; periodo: string }

const FUENTES: Fuente[] = [
  { dato: 'Clorofila-a (fitoplancton)', nasa: 'Incluye sensores de la NASA', fuente: <><a href="https://climate.esa.int/en/projects/ocean-colour/">ESA Ocean Colour CCI v6</a>, vía ERDDAP de NOAA NEFSC. Mezcla varios satélites, entre ellos SeaWiFS y MODIS-Aqua de la NASA</>, periodo: '1998–2026' },
  { dato: 'Mapa de clorofila sobre el globo (celdas de 0,5°)', nasa: 'Incluye sensores de la NASA', fuente: <>ESA Ocean Colour CCI v6 (<code>occci_V6_monthly_4km</code>), vía <a href="https://comet.nefsc.noaa.gov/erddap/griddap/occci_V6_monthly_4km.html">ERDDAP de NOAA NEFSC</a>; media geométrica de 4 puntos por celda</>, periodo: '1998–2025' },
  { dato: 'Mapa de temperatura sobre el globo (celdas de 1°)', fuente: <>NOAA Coral Reef Watch v3.1 (<code>CRW_sst_v3_1_monthly</code>), vía <a href="https://oceanwatch.pifsc.noaa.gov/erddap/griddap/CRW_sst_v3_1_monthly.html">NOAA OceanWatch</a>; anomalía frente a 1998–2020</>, periodo: '1998–2025' },
  { dato: 'Vista satelital del globo', nasa: 'Imagen de la NASA', fuente: <>NASA Blue Marble, en la versión que distribuye <a href="https://github.com/vasturiano/three-globe">three-globe</a></>, periodo: '—' },
  { dato: 'Turbidez del agua (Kd490)', fuente: <>ESA Ocean Colour CCI v6, vía <a href="https://oceanwatch.pifsc.noaa.gov/erddap/">NOAA OceanWatch</a></>, periodo: '1998–2026' },
  { dato: 'Temperatura del mar', fuente: 'NOAA Coral Reef Watch v3.1 (OceanWatch)', periodo: '1985–2025' },
  { dato: 'Salinidad', fuente: 'Satélite SMOS de la ESA (OceanWatch)', periodo: '2010–2025' },
  { dato: 'Corrientes y nivel del mar', nasa: 'OSCAR es un producto de la NASA', fuente: 'OSCAR (NASA/ESR) y NOAA/NESDIS (OceanWatch)', periodo: '1993–2018' },
  { dato: 'Viento sobre el mar', fuente: 'CCMP v2 de Remote Sensing Systems (OceanWatch)', periodo: '1993–2018' },
  { dato: 'Aire en la Base Machu Picchu y la costa', nasa: 'Producto de la NASA', fuente: <><a href="https://power.larc.nasa.gov/">NASA POWER</a> (MERRA-2 y CERES)</>, periodo: '1984–2024' },
  { dato: 'Nitrato, fosfato y silicato', fuente: <><a href="https://www.ncei.noaa.gov/access/world-ocean-atlas-2023/">World Ocean Atlas 2023</a>, NOAA NCEI (promedio histórico)</>, periodo: '1955–2022' },
  { dato: 'Hielo marino antártico', fuente: <a href="https://nsidc.org/data/g02135">NSIDC Sea Ice Index G02135</a>, periodo: '1979–2025' },
  { dato: 'El Niño costero (Niño 1+2) y vientos antárticos (SAM)', fuente: <a href="https://psl.noaa.gov/data/climateindices/">NOAA PSL</a>, periodo: '1948–2026' },
  { dato: 'Monitor de condiciones', fuente: 'Reanálisis CMEMS y OC-CCI; ICEN de IGP/ENFEN; Niño 1+2 de NOAA PSL/CPC; biomasa de anchoveta en intervalos de crucero de IMARPE', periodo: '1998–2026' },
  { dato: 'Escenarios de El Niño (débil, central e intenso)', fuente: 'Construidos con la climatología mensual del monitor y sus pendientes históricas frente al ICEN, siguiendo una trayectoria asumida de El Niño. Son escenarios, no pronósticos', periodo: 'sep 2026–feb 2027' },
  { dato: 'Pesca de anchoveta, concha de abanico, krill y otras', fuente: <a href="https://www.fao.org/fishery/en/collection/global_production">FAO Global Production 2026.1</a>, periodo: '1950–2024' },
  { dato: 'Atlas del globo', fuente: <>Países de <a href="https://www.naturalearthdata.com/">Natural Earth</a> (1:110 m) y mapa de alturas de <a href="https://github.com/vasturiano/three-globe">three-globe</a>, pintados en bandas planas</>, periodo: '—' },
  { dato: 'Referencias para contar El Niño', fuente: <><a href="https://science.nasa.gov/earth/earth-observatory/">NASA Earth Observatory</a> y <a href="https://svs.gsfc.nasa.gov/12176">NASA Scientific Visualization Studio</a></>, periodo: '—' },
]

/** Tabla de fuentes de datos */
export default function FuentesSection() {
  return <section className="seccion" id="fuentes" aria-labelledby="t-fuentes">
    <div className="encabezado-seccion">
      <h2 id="t-fuentes">Fuentes de datos</h2>
      <p>Todo es de acceso libre y se descargó sin cuenta. Las zonas son cajas de latitud y longitud, y cada valor mensual es la mediana de los píxeles del satélite dentro de la caja. Los mapas del globo cubren del ecuador a los 70° S, entre los 92° y los 52° O.</p>
    </div>
    <div className="tabla-envoltura">
      <table className="fuentes">
        <thead><tr><th scope="col">Dato</th><th scope="col">Fuente</th><th scope="col">Periodo</th></tr></thead>
        <tbody>{FUENTES.map((f) => <tr key={f.dato}>
          <td>{f.dato}{f.nasa && <span className="tag-nasa" title={f.nasa}>NASA</span>}</td>
          <td>{f.fuente}</td>
          <td className="num">{f.periodo}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="siguiente-paso"><strong>Siguiente paso posible:</strong> la misión <strong>PACE</strong> de la NASA (sensor OCI, con datos desde febrero de 2024) mide la clorofila y además distingue tipos de fitoplancton. Sus datos piden una cuenta gratuita de NASA Earthdata, por eso todavía no están aquí.</p>
  </section>
}
