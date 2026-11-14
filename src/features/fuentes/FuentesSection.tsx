import type { ReactNode } from 'react'

type Fuente = { dato: string; nasa?: string; fuente: ReactNode; periodo: string }

const FUENTES: Fuente[] = [
  { dato: 'Independent chlorophyll comparison: Chimbote and Paita', nasa: 'NASA product', fuente: <><a href="https://giovanni.gsfc.nasa.gov/giovanni/">MODIS-Aqua L3m CHL v2022.0, via NASA Giovanni</a>; monthly 4 km area averages; missing fill values excluded</>, periodo: 'Jul 2002–Nov 2025' },
  { dato: 'Long-record temperature check', fuente: <a href="https://psl.noaa.gov/data/gridded/data.noaa.ersst.v5.html">NOAA PSL ERSST v5 (2°)</a>, periodo: '1854–2026; analysis windows vary' },
  { dato: 'El Niño physical chain: temperature, sea level, oxygen and nutrients', fuente: <a href="https://marine.copernicus.eu/">Copernicus Marine Service (CMEMS), reanalysis and model series</a>, periodo: '1998–2025' },
  { dato: 'Coastal rain, air temperature and radiation', nasa: 'NASA product', fuente: <a href="https://power.larc.nasa.gov/">NASA POWER</a>, periodo: 'Period depends on series' },
  { dato: 'Monthly fisheries landings', fuente: <a href="https://estadisticas.bcrp.gob.pe/estadisticas/series/">BCRP</a>, periodo: '2003–2026' },
  { dato: 'Survey biomass and fisheries yearbooks', fuente: <><a href="https://www.gob.pe/imarpe">IMARPE</a> surveys; <a href="https://www.gob.pe/produce">PRODUCE</a> yearbooks</>, periodo: 'Period depends on survey or yearbook' },
  { dato: 'Species occurrence records', fuente: <a href="https://www.gbif.org/">GBIF</a>, periodo: 'Period depends on occurrence record' },
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
      <p>Open satellite, reanalysis and fisheries records. Zones are latitude–longitude boxes; aggregation depends on the product. Giovanni uses area averages, while satellite zone series and globe cells follow their source-specific methods. Globe maps cover the equator to 70° S, between 92° and 52° W.</p>
    </div>
    <div className="tabla-envoltura">
      <table className="fuentes">
        <thead><tr><th scope="col">Data</th><th scope="col">Source</th><th scope="col">Period</th></tr></thead>
        <tbody>{FUENTES.map((f) => <tr key={f.dato}>
          <td>{f.dato}{f.nasa && <span className="tag-nasa" title={f.nasa}>NASA</span>}</td>
          <td>{f.fuente}</td>
          <td className="num">{f.periodo}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="method" id="method">
      <h3>Method</h3>
      <p>We accept an association only when it survives partial correlation controlling for Niño 1+2, an effective sample size adjustment for autocorrelation (Pyper and Peterman, 1998), and Benjamini–Hochberg FDR correction within each family (adjusted p &lt; 0.05). Its direction must agree without 1998 and in both halves of the record.</p>
      <p>Trends use annual Mann-Kendall tests with Theil–Sen slopes, checked with another method, season and period. The interactive panel adds a 95% Sen slope interval and a two-sided regression t-test. A single significant result does not establish robustness. Monthly seasonal Hirsch tests without autocorrelation correction are not treated as evidence.</p>
      <p>References: <a href="https://doi.org/10.1139/f98-104">Pyper &amp; Peterman (1998)</a>; <a href="https://doi.org/10.1111/j.2517-6161.1995.tb02031.x">Benjamini &amp; Hochberg (1995)</a>; <a href="https://doi.org/10.2307/1907187">Mann (1945)</a>; Kendall, <cite>Rank Correlation Methods</cite> (1975); <a href="https://doi.org/10.1080/01621459.1968.10480934">Sen (1968)</a>; <a href="https://doi.org/10.1029/WR018i001p00107">Hirsch et al. (1982)</a>.</p>
      <p>Trend implementation references: <a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html">Sen confidence intervals</a> and <a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html">regression slope t-test</a>. Explore the challenge’s resources through <a href="https://www.spaceappschallenge.org/2026/challenges/be-an-earth-system-trend-detective/">Be an Earth System Trend Detective!</a> and <a href="https://giovanni.gsfc.nasa.gov/giovanni/">NASA Giovanni</a>. A non-significant result is a valid finding.</p>
      <p>Further reading from the challenge’s resources: <a href="https://ntrs.nasa.gov/citations/20090042747">Acker et al., coastal SeaWiFS chlorophyll time series</a>; <a href="https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b">an introduction to trend tests</a>; <a href="https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance">a guide to statistical significance</a>. The latter two are introductory articles; the methods above cite the statistical references used in this analysis.</p>
    </div>
    <p className="siguiente-paso"><strong>Possible next step:</strong> NASA's <strong>PACE</strong> mission (OCI sensor, with data since February 2024) measures chlorophyll and distinguishes phytoplankton types. Its data require a free NASA Earthdata account, so they are not included here yet.</p>
  </section>
}
