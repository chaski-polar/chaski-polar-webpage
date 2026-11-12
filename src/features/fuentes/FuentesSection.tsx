import type { ReactNode } from 'react'

type Fuente = { dato: string; nasa?: string; fuente: ReactNode; periodo: string }

const FUENTES: Fuente[] = [
  { dato: 'Chlorophyll-a (phytoplankton)', nasa: 'Includes NASA sensors', fuente: <><a href="https://climate.esa.int/en/projects/ocean-colour/">ESA Ocean Colour CCI v6</a>, via NOAA NEFSC ERDDAP. Combines several satellites, including NASA SeaWiFS and MODIS-Aqua</>, periodo: '1998–2026' },
  { dato: 'Globe chlorophyll map (0.5° cells)', nasa: 'Includes NASA sensors', fuente: <>ESA Ocean Colour CCI v6 (<code>occci_V6_monthly_4km</code>), via <a href="https://comet.nefsc.noaa.gov/erddap/griddap/occci_V6_monthly_4km.html">NOAA NEFSC ERDDAP</a>; geometric mean of 4 points per cell</>, periodo: '1998–Sep 2026' },
  { dato: 'Globe temperature map (1° cells)', fuente: <>NOAA Coral Reef Watch v3.1 (<code>CRW_sst_v3_1_monthly</code>), via <a href="https://oceanwatch.pifsc.noaa.gov/erddap/griddap/CRW_sst_v3_1_monthly.html">NOAA OceanWatch</a>; anomaly relative to 1998–2020</>, periodo: '1998–Oct 2026' },
  { dato: 'Globe satellite view', nasa: 'NASA imagery', fuente: <>NASA Blue Marble, distributed by <a href="https://github.com/vasturiano/three-globe">three-globe</a></>, periodo: '—' },
  { dato: 'Water turbidity (Kd490)', fuente: <>ESA Ocean Colour CCI v6, via <a href="https://oceanwatch.pifsc.noaa.gov/erddap/">NOAA OceanWatch</a></>, periodo: '1998–2026' },
  { dato: 'Sea temperature', fuente: 'NOAA Coral Reef Watch v3.1 (OceanWatch)', periodo: '1985–Oct 2026' },
  { dato: 'Salinity', fuente: 'ESA SMOS satellite (OceanWatch)', periodo: '2010–Oct 2026' },
  { dato: 'Currents and sea level', nasa: 'OSCAR is a NASA product', fuente: 'OSCAR (NASA/ESR) and NOAA/NESDIS (OceanWatch)', periodo: '1993–2018' },
  { dato: 'Wind over the sea', fuente: 'ERA5 (ECMWF/Copernicus) in Peruvian zones, sea points only; CCMP v2 from Remote Sensing Systems in Antarctica', periodo: '1998–Sep 2026 (Peru); 1993–2018 (Antarctica)' },
  { dato: 'Air at Machu Picchu Base and the coast', nasa: 'NASA product', fuente: <><a href="https://power.larc.nasa.gov/">NASA POWER</a> (MERRA-2 and CERES)</>, periodo: '1984–2024' },
  { dato: 'Nitrate, phosphate and silicate', fuente: <><a href="https://www.ncei.noaa.gov/access/world-ocean-atlas-2023/">World Ocean Atlas 2023</a>, NOAA NCEI (historical average)</>, periodo: '1955–2022' },
  { dato: 'Antarctic sea ice', fuente: <a href="https://nsidc.org/data/g02135">NSIDC Sea Ice Index G02135</a>, periodo: '1979–Aug 2026' },
  { dato: 'Coastal El Niño (Niño 1+2) and Antarctic winds (SAM)', fuente: <a href="https://psl.noaa.gov/data/climateindices/">NOAA PSL</a>, periodo: '1948–2026' },
  { dato: 'Conditions monitor', fuente: 'CMEMS and OC-CCI reanalyses; ICEN from IGP/ENFEN; Niño 1+2 from NOAA PSL/CPC; anchoveta biomass during IMARPE survey intervals', periodo: '1998–2026' },
  { dato: 'El Niño scenarios (weak, central and intense)', fuente: 'Built from the monitor monthly climatology and historical slopes relative to ICEN, following an assumed El Niño trajectory. These are scenarios, not forecasts', periodo: 'Sep 2026–Feb 2027' },
  { dato: 'Anchoveta, scallop, krill and other catches', fuente: <a href="https://www.fao.org/fishery/en/collection/global_production">FAO Global Production 2026.1</a>, periodo: '1950–2024' },
  { dato: 'Globe atlas', fuente: <>Countries from <a href="https://www.naturalearthdata.com/">Natural Earth</a> (1:110m) and the elevation map from <a href="https://github.com/vasturiano/three-globe">three-globe</a>, painted in flat bands</>, periodo: '—' },
  { dato: 'References for counting El Niño', fuente: <><a href="https://science.nasa.gov/earth/earth-observatory/">NASA Earth Observatory</a> and <a href="https://svs.gsfc.nasa.gov/12176">NASA Scientific Visualization Studio</a></>, periodo: '—' },
]

/** Tabla de fuentes de datos */
export default function FuentesSection() {
  return <section className="seccion" id="fuentes" aria-labelledby="t-fuentes">
    <div className="encabezado-seccion">
      <h2 id="t-fuentes">Data sources</h2>
      <p>Everything is openly available and was downloaded without an account. Zones are latitude–longitude boxes, and each monthly value is the median of satellite pixels inside the box. Globe maps cover the equator to 70° S, between 92° and 52° W.</p>
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
    <p className="siguiente-paso"><strong>Possible next step:</strong> NASA's <strong>PACE</strong> mission (OCI sensor, with data since February 2024) measures chlorophyll and distinguishes phytoplankton types. Its data require a free NASA Earthdata account, so they are not included here yet.</p>
  </section>
}
