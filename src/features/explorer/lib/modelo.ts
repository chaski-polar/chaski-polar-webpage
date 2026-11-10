/* Calendario y cálculos sobre los datos: anomalías, colores de cada zona, textos y correlaciones.
   No toca la página: recibe los datos y responde preguntas sobre ellos. */
import { SIN_DATO, colorDiverge, colorRampa, tClorofila } from "../../../lib/color";
import { media, pearson } from "../../../lib/estadistica";
import { MESES_LARGOS, claveMes, mesesDesde, mesesEntre, nf, signo, type Mes } from "../../../lib/formato";
import type { DatosExplorador } from "./adaptador";
import type { CampoEscenario, CampoMonitor, CampoSerieMonitor, ClaveZonaMonitor, MetadataMonitor, DatosSeries, FilaAnual, FilaEscenario, IdZona, NombreEscenario, RegistroMonitor, Serie, Zona } from "./tipos";
import type { Variable } from "./variables";

export interface TextoAnomalia {
  /** "+12 %" */
  corto: string;
  /** "12 % más que un mayo normal" */
  frase: string;
  valor: number;
}

export interface EventoNino {
  anio: number;
  nombre: string;
  /** mes del pico de calor */
  i: number;
}

export const ZONA_CHIMBOTE: IdZona = "peru_centro_norte_chimbote";
export const ZONA_REY_JORGE: IdZona = "antartida_rey_jorge";
export const esPeru = (z: string): boolean => z.startsWith("peru");

const CAMPOS_ESCENARIO = new Set<CampoMonitor>(["sst_c", "sss_psu", "chlorophyll_a_mg_m3", "nitrate_mmol_m3", "phosphate_mmol_m3", "oxygen_ml_l", "phytoplankton_carbon_mg_c_m3", "nino12_anom_c", "icen"]);
const esCampoEscenario = (c: CampoMonitor): c is CampoEscenario => CAMPOS_ESCENARIO.has(c);

export class Modelo {
  readonly D: DatosSeries;
  readonly zonas: Record<IdZona, Zona>;
  readonly ids: IdZona[];
  /** calendario completo: desde el inicio de las series hasta el último mes de los escenarios */
  readonly meses: Mes[];
  /** primer mes que muestra la página (enero de 1998, inicio de la clorofila satelital) */
  readonly i0: number;
  /** último mes con clorofila en alguna zona */
  readonly ultimoSeries: number;
  private readonly finClima: number;
  /** último mes observado (series o monitor) */
  readonly ultimoObservado: number;
  /** último mes con datos por zona: hasta aquí llegan el globo y su línea de tiempo */
  readonly ultimo: number;
  /** último mes del calendario (incluye los escenarios de El Niño del monitor) */
  readonly ultimoCalendario: number;
  /** primer mes de escenarios de El Niño, si hay */
  readonly inicioEscenario: number | null;
  readonly anual: FilaAnual[];
  readonly hayMonitor: boolean;

  private readonly porMesMonitor: Map<string, RegistroMonitor>;
  private readonly porMesEscenario: Map<string, FilaEscenario>;
  private readonly cacheClima = new Map<string, (number | null)[]>();
  private readonly cacheR = new Map<string, number | null>();
  readonly registrosMonitor: RegistroMonitor[];
  /** zonas, eventos de El Niño y hallazgos calculados junto con el monitor */
  readonly metadataMonitor: MetadataMonitor;
  /** Niño 1+2: índice de NOAA, luego el monitor y al final el escenario central */
  readonly nino: Serie;

  constructor({ series: D, monitor, escenarios }: DatosExplorador) {
    this.D = D;
    this.zonas = D.zonas;
    this.ids = Object.keys(D.zonas) as IdZona[];
    this.anual = D.juego;
    this.registrosMonitor = monitor?.records ?? [];
    this.metadataMonitor = monitor?.metadata ?? {};
    this.hayMonitor = this.registrosMonitor.length > 0;
    this.porMesMonitor = new Map(this.registrosMonitor.map((r) => [r.date.slice(0, 7), r]));
    this.porMesEscenario = new Map((escenarios?.filas ?? []).map((f) => [`${f.fecha}|${f.escenario}`, f]));

    const primera = this.ids[0] as IdZona;
    const nSeries = D.series[primera].clorofila_mg_m3?.length ?? 0;
    const finSeries = nSeries - 1;
    const finMonitor = monitor ? mesesEntre(D.meses_inicio, monitor.period.end.slice(0, 7)) : -1;
    const finEscenario = escenarios ? mesesEntre(D.meses_inicio, escenarios.periodo.fin) : -1;
    this.ultimoCalendario = Math.max(finSeries, finMonitor, finEscenario);
    this.meses = mesesDesde(D.meses_inicio, this.ultimoCalendario + 1);
    this.i0 = Math.max(0, this.idxMes(1998, 0));
    this.inicioEscenario = escenarios ? mesesEntre(D.meses_inicio, escenarios.periodo.inicio) : null;

    // clorofila y temperatura por zona: las series del monitor (la misma fuente, más actualizadas) completan los meses que faltan
    for (const z of this.ids) {
      const c = this.claveMonitor(z);
      if (!c) continue;
      const s = D.series[z];
      for (const [id, campo] of [["clorofila_mg_m3", `chl_${c}_mg_m3`], ["temperatura_superficial_C", `sst_${c}_c`]] as const) {
        const base = s[id] ?? [];
        s[id] = this.meses.map((_, i) => base[i] ?? this.registroMonitor(i)?.[campo] ?? null);
      }
    }

    // índices: SAM y extensión del hielo son la misma serie en el monitor; la anomalía del hielo solo cambia de
    // periodo de referencia, así que se convierte con la diferencia de cada mes calendario
    const ind = D.indices;
    const refHielo = Array.from({ length: 12 }, (_, m) => media(ind.hielo.map((h, i) => (i % 12 === m && h != null && ind.hielo_anom[i] != null ? h - (ind.hielo_anom[i] as number) : null))));
    const completar = (s: Serie, valor: (i: number) => number | null): Serie => this.meses.map((_, i) => s[i] ?? valor(i));
    ind.sam = completar(ind.sam, (i) => this.registroMonitor(i)?.sam_index ?? null);
    ind.hielo = completar(ind.hielo, (i) => this.registroMonitor(i)?.sea_ice_antarctic_mkm2 ?? null);
    ind.hielo_anom = completar(ind.hielo_anom, (i) => {
      const h = ind.hielo[i], ref = refHielo[this.mes(i).mes];
      return h == null || ref == null ? null : h - ref;
    });

    let ultimoSeries = this.i0, ultimo = this.i0;
    for (let i = this.i0; i <= this.ultimoCalendario; i++) {
      if (this.ids.some((z) => D.series[z].clorofila_mg_m3?.[i] != null)) ultimoSeries = i;
      if (ind.hielo[i] != null || this.ids.some((z) => D.series[z].clorofila_mg_m3?.[i] != null || D.series[z].temperatura_superficial_C?.[i] != null)) ultimo = i;
    }
    this.ultimoSeries = ultimoSeries;
    this.ultimo = ultimo;
    // lo "normal" de cada mes se calcula con 1998–2025, igual que en el análisis
    this.finClima = Math.min(ultimoSeries, this.idxMes(2025, 11));
    this.ultimoObservado = Math.max(ultimoSeries, Math.min(finMonitor, this.inicioEscenario == null ? finMonitor : this.inicioEscenario - 1));

    // viento: rapidez a partir de sus componentes
    for (const z of this.ids) {
      const s = D.series[z], u = s.viento_u_m_s, v = s.viento_v_m_s;
      if (u && v) s.viento = u.map((x, i) => { const y = v[i]; return x == null || y == null ? null : Math.hypot(x, y); });
    }

    // Niño 1+2: una sola versión del índice (NOAA PSL, la del monitor, que es la del análisis y los escenarios)
    this.nino = this.meses.map((_, i) => (i > this.ultimoObservado ? null : this.registroMonitor(i)?.nino12_psl_c ?? D.indices.nino12[i] ?? null));
  }

  /* ---------- calendario ---------- */
  idxMes(anio: number, mes: number): number {
    const [a0 = 0, m0 = 1] = this.D.meses_inicio.split("-").map(Number);
    const i = anio * 12 + mes - (a0 * 12 + m0 - 1);
    return i >= 0 && i <= this.ultimoCalendario ? i : -1;
  }
  mes(i: number): Mes {
    return this.meses[i] ?? { anio: 1998, mes: 0 };
  }
  esEscenario(i: number): boolean {
    return this.inicioEscenario != null && i >= this.inicioEscenario;
  }

  zona(z: IdZona): Zona {
    return this.zonas[z];
  }
  esZona(z: string | null | undefined): z is IdZona {
    return z != null && z in this.zonas;
  }

  /* ---------- series ---------- */
  valorSerie(z: IdZona, id: string, i: number): number | null {
    return this.D.series[z][id]?.[i] ?? null;
  }
  tieneSerie(z: IdZona, id: string): boolean {
    return (this.D.series[z][id] ?? []).some((x) => x != null);
  }

  registroMonitor(i: number): RegistroMonitor | undefined {
    return this.porMesMonitor.get(claveMes(this.mes(i)));
  }
  filaEscenario(i: number, escenario: NombreEscenario = "central"): FilaEscenario | undefined {
    return this.porMesEscenario.get(`${claveMes(this.mes(i))}|${escenario}`);
  }
  /** Valor del monitor en un mes; después del último mes observado, el del escenario indicado */
  valorMonitor(campo: CampoMonitor, i: number, escenario: NombreEscenario = "central"): number | null {
    const r = this.registroMonitor(i)?.[campo];
    if (r != null) return r;
    if (!this.esEscenario(i) || !esCampoEscenario(campo)) return null;
    return this.filaEscenario(i, escenario)?.[campo] ?? null;
  }
  /** Serie de un escenario: solo los meses de escenario (y el último observado, para unir la línea) */
  serieEscenario(campo: CampoMonitor, escenario: NombreEscenario): Serie {
    if (this.inicioEscenario == null || !esCampoEscenario(campo)) return this.meses.map(() => null);
    const inicio = this.inicioEscenario;
    return this.meses.map((_, i) => (i === inicio - 1 ? this.registroMonitor(i)?.[campo] ?? null : i >= inicio ? this.filaEscenario(i, escenario)?.[campo] ?? null : null));
  }

  /** Valor del dato en una zona y un mes, o null si esa zona no lo tiene */
  valorZona(z: IdZona, v: Variable, i: number): number | null {
    if (v.modo === "indice") return esPeru(z) ? null : this.D.indices.hielo[i] ?? null;
    return this.valorSerie(z, v.id, i);
  }
  /** Serie completa de una zona (multiplicada por el factor de la variable) */
  serieZona(z: IdZona, v: Variable): Serie {
    const f = v.factor ?? 1;
    return this.meses.map((_, i) => { const x = this.valorZona(z, v, i); return x == null ? null : x * f; });
  }
  tieneDato(z: IdZona | null, v: Variable): boolean {
    if (v.modo === "indice") return z == null || !esPeru(z);
    return z == null || this.tieneSerie(z, v.id);
  }

  /* ---------- anomalías ---------- */
  private climatologia(z: IdZona, id: string): (number | null)[] {
    const k = `${z}|${id}`;
    let c = this.cacheClima.get(k);
    if (!c) {
      const s = this.D.series[z][id] ?? [];
      c = Array.from({ length: 12 }, (_, m) => media(s.filter((_, i) => this.mes(i).mes === m && i <= this.finClima)));
      this.cacheClima.set(k, c);
    }
    return c;
  }

  /** Anomalía normalizada (cerca de −1 a 1) frente al mes normal de la zona */
  anomalia(z: IdZona, v: Variable, i: number): number | null {
    if (v.modo === "indice") {
      if (esPeru(z)) return null;
      const a = this.D.indices.hielo_anom[i];
      return a == null ? null : a / v.rango;
    }
    const x = this.valorSerie(z, v.id, i);
    if (x == null) return null;
    if (v.modo === "directo") return x / v.rango;
    const c = this.climatologia(z, v.id)[this.mes(i).mes];
    if (c == null) return null;
    return v.modo === "log" ? Math.log2(x / c) / v.rango : (x - c) / v.rango;
  }

  anomaliaTxt(z: IdZona, v: Variable, i: number): TextoAnomalia | null {
    if (v.modo === "indice") {
      const a = esPeru(z) ? null : this.D.indices.hielo_anom[i];
      if (a == null) return null;
      return { corto: `${signo(a)}${nf(1).format(Math.abs(a))}`, frase: `${nf(2).format(Math.abs(a))} millones de km² ${a >= 0 ? "por encima" : "por debajo"} de lo normal`, valor: a };
    }
    const x = this.valorSerie(z, v.id, i);
    if (x == null) return null;
    if (v.modo === "directo") {
      const d = x * (v.factor ?? 1);
      return { corto: `${signo(d)}${nf(v.dec).format(Math.abs(d))} ${v.unidad}`, frase: `${nf(v.dec).format(Math.abs(d))} ${v.unidad} ${d >= 0 ? "por encima" : "por debajo"} de lo normal`, valor: d };
    }
    const c = this.climatologia(z, v.id)[this.mes(i).mes];
    if (c == null) return null;
    const mes = MESES_LARGOS[this.mes(i).mes];
    if (v.modo === "log") {
      const p = (x / c - 1) * 100;
      return { corto: `${signo(p)}${nf(0).format(Math.abs(p))} %`, frase: `${nf(0).format(Math.abs(p))} % ${p >= 0 ? "más" : "menos"} que un ${mes} normal`, valor: p };
    }
    const d = x - c;
    return { corto: `${signo(d)}${nf(v.dec).format(Math.abs(d))} ${v.unidad}`, frase: `${nf(v.dec).format(Math.abs(d))} ${v.unidad} ${d >= 0 ? "sobre" : "bajo"} lo normal para ${mes}`, valor: d };
  }

  /** Color de la zona en un mes (la misma escala que la leyenda) */
  colorZona(z: IdZona, v: Variable, i: number, alfa = 0.85): string {
    if (v.mapa === "clorofila") {
      const x = this.valorSerie(z, v.id, i);
      return x == null ? SIN_DATO : colorRampa(tClorofila(x), alfa);
    }
    const t = this.anomalia(z, v, i);
    if (t == null) return v.modo === "indice" && esPeru(z) ? "rgba(120,140,155,0.2)" : SIN_DATO;
    return v.escala === "rampa" ? colorRampa((t + 1) / 2, alfa) : colorDiverge(t, alfa);
  }

  valorTxt(v: Variable, x: number): string {
    return `${nf(v.dec).format(x * (v.factor ?? 1))} ${v.unidad}`;
  }

  /** Correlación mes a mes de las anomalías de dos zonas */
  rZonas(a: IdZona, b: IdZona, v: Variable): number | null {
    const k = [a, b].sort().join("|") + v.id;
    if (this.cacheR.has(k)) return this.cacheR.get(k) ?? null;
    const xa: (number | null)[] = [], xb: (number | null)[] = [];
    for (let i = this.i0; i <= this.ultimoSeries; i++) { xa.push(this.anomalia(a, v, i)); xb.push(this.anomalia(b, v, i)); }
    const r = pearson(xa, xb);
    this.cacheR.set(k, r);
    return r;
  }

  /** Otras zonas ordenadas por parecido (vacío para datos regionales, que no se comparan entre zonas) */
  conexionesDe(z: IdZona, v: Variable): { o: IdZona; r: number }[] {
    if (v.modo === "indice") return [];
    return this.ids.filter((o) => o !== z)
      .map((o) => ({ o, r: this.rZonas(z, o, v) }))
      .filter((c): c is { o: IdZona; r: number } => c.r != null)
      .sort((x, y) => y.r - x.r);
  }

  /** Mes más alto (sgn = 1) o más bajo (−1) frente a lo normal, en un año o en toda la serie */
  mesExtremo(z: IdZona, v: Variable, anio: number | null, sgn: 1 | -1): number | null {
    let mejor: number | null = null, iMejor: number | null = null;
    for (let i = this.i0; i <= this.ultimo; i++) {
      if (anio != null && this.mes(i).anio !== anio) continue;
      const t = this.anomalia(z, v, i);
      if (t != null && (mejor == null || t * sgn > mejor * sgn)) { mejor = t; iMejor = i; }
    }
    return iMejor;
  }

  /** Promedio de las anomalías de una región en un mes (para la franja de la línea de tiempo) */
  anomaliaRegional(v: Variable, i: number): number | null {
    const zonas = v.modo === "indice" ? this.ids.filter((z) => !esPeru(z)).slice(0, 1) : this.ids.filter(esPeru);
    return media(zonas.map((z) => this.anomalia(z, v, i)));
  }

  /** Meses de cada El Niño en que el índice Niño 1+2 llegó a su máximo */
  eventosNino(): EventoNino[] {
    const eventos = [
      { anio: 1998, nombre: "El Niño 1997–98" },
      { anio: 2016, nombre: "El Niño 2015–16" },
      { anio: 2017, nombre: "El Niño costero 2017" },
      { anio: 2023, nombre: "El Niño 2023" },
      { anio: 2026, nombre: "El Niño 2026" },
    ];
    return eventos.flatMap((e) => {
      let mejor: number | null = null;
      for (let i = this.i0; i <= this.ultimoObservado; i++) {
        const v = this.nino[i];
        if (this.mes(i).anio === e.anio && v != null && (mejor == null || v > (this.nino[mejor] ?? -Infinity))) mejor = i;
      }
      return mejor == null ? [] : [{ ...e, i: mejor }];
    });
  }

  /* ---------- resúmenes anuales ---------- */
  pescaAnio(anio: number, especie: "anchoveta_peru" | "krill_mundo" = "anchoveta_peru"): number | null {
    return this.D.pesca[especie][anio - this.D.pesca.inicio] ?? null;
  }
  mediaMonitorAnio(campo: CampoMonitor, anio: number): number | null {
    return media(this.registrosMonitor.filter((r) => r.date.startsWith(`${anio}-`)).map((r) => r[campo]));
  }
  /** Clave corta de una zona en el monitor (null si el monitor no tiene esa zona) */
  claveMonitor(z: IdZona): ClaveZonaMonitor | null {
    const zonas = this.metadataMonitor.zonas ?? {};
    for (const [clave, info] of Object.entries(zonas) as [ClaveZonaMonitor, { id_original: IdZona }][]) if (info.id_original === z) return clave;
    return null;
  }

  ultimoMonitor(campo: CampoSerieMonitor): RegistroMonitor | undefined {
    return [...this.registrosMonitor].reverse().find((r) => r[campo] != null);
  }
  /** Año con menos hielo marino antártico (anomalía media) */
  hieloMinimo(): FilaAnual | null {
    return this.anual.reduce<FilaAnual | null>((min, j) => (j.hielo != null && (!min || j.hielo < (min.hielo ?? Infinity)) ? j : min), null);
  }
  /** Año con más clorofila media frente a una zona */
  anioMasVerde(z: IdZona): number {
    let mejor: { anio: number; valor: number } | null = null;
    for (let anio = 1998; anio <= this.mes(this.ultimoSeries).anio; anio++) {
      const xs = this.meses.map((m, i) => (m.anio === anio ? this.valorSerie(z, "clorofila_mg_m3", i) : null));
      const valor = media(xs);
      if (valor != null && (!mejor || valor > mejor.valor)) mejor = { anio, valor };
    }
    return mejor?.anio ?? 2013;
  }
}

export const BASE_MACHU_PICCHU = { lat: -62.09, lng: -58.47 };

export function distanciaKm(a: number, b: number, c: number, d: number): number {
  const R = 6371, rad = Math.PI / 180;
  const x = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Zonas ordenadas por distancia a un punto */
export function zonasCercanas(m: Modelo, lat: number, lng: number): { z: IdZona; d: number }[] {
  return m.ids.map((z) => ({ z, d: distanciaKm(lat, lng, m.zona(z).lat, m.zona(z).lon) })).sort((a, b) => a.d - b.d);
}
