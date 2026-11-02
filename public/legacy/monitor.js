/* Monitor estático: consume la salida JSON generada por data_treatment. */
(function () {
  const payload = window.MONITOR_DATA;
  if (!payload || !window.Chart) return;

  const records = payload.records || [];
  const variables = [
    ["chlorophyll_a_mg_m3", "Clorofila-a / fitoplancton", "mg/m³", "#3fc28c"],
    ["sst_c", "Temperatura superficial", "°C", "#f08a4b"],
    ["nitrate_mmol_m3", "Nitrato", "mmol/m³", "#63cde8"],
    ["phytoplankton_carbon_mg_c_m3", "Carbono fitoplanctónico", "mg C/m³", "#a9dc6e"],
    ["nino12_anom_c", "Anomalía Niño 1+2", "°C", "#ff9a62"],
    ["biomass_total_t", "Biomasa observada en cruceros", "t", "#eaf3f5"],
  ];
  const byId = (id) => document.getElementById(id);
  const variable = byId("monitor-variable");
  const escala = byId("monitor-escala");
  const estado = byId("monitor-estado");
  const chartCanvas = byId("monitor-chart");
  let chart;

  variables.forEach(([id, name]) => variable.add(new Option(name, id)));
  variable.value = "chlorophyll_a_mg_m3";
  byId("monitor-periodo").textContent = `${payload.period.start.slice(0, 7)} → ${payload.period.end.slice(0, 7)} · ${records.length} meses`;
  const observed = records.filter((r) => r.biomass_observed).length;
  byId("monitor-observados").textContent = observed;

  function fmt(value, id) {
    if (value == null) return "sin dato";
    const decimals = id.includes("biomass") ? 0 : id.includes("nitrate") || id.includes("carbon") ? 2 : 1;
    return `${new Intl.NumberFormat("es", { maximumFractionDigits: decimals }).format(value)}`;
  }

  function build() {
    const id = variable.value;
    const def = variables.find((v) => v[0] === id);
    const isBiomass = id === "biomass_total_t";
    const values = records.map((r) => isBiomass ? r.biomass_total_t_interpolated : r[id]);
    let plotted = values;
    let suffix = def[2];
    if (escala.value === "anomaly") {
      const byMonth = Array.from({ length: 12 }, (_, month) => {
        const xs = records.filter((r) => new Date(r.date).getUTCMonth() === month && r[id] != null).map((r) => r[id]);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
      });
      plotted = values.map((value, i) => value == null || byMonth[new Date(records[i].date).getUTCMonth()] == null ? null : value - byMonth[new Date(records[i].date).getUTCMonth()]);
      suffix = `${def[2]} · anomalía mensual`;
    }
    const available = values.filter((v) => v != null);
    const last = [...records].reverse().find((r) => (isBiomass ? r.biomass_total_t_interpolated : r[id]) != null);
    const color = def[3];
    if (chart) chart.destroy();
    const datasets = [{ label: `${def[1]} (${suffix})`, data: plotted, borderColor: color, backgroundColor: `${color}22`, borderWidth: 2, pointRadius: isBiomass ? 0 : 0, spanGaps: false, fill: true }];
    if (isBiomass) datasets.push({ label: "Observada en crucero", data: records.map((r) => r.biomass_observed ? r.biomass_total_t : null), borderColor: "#eaf3f5", backgroundColor: "#eaf3f5", borderWidth: 0, pointRadius: 4, pointHoverRadius: 6, showLine: false });
    chart = new Chart(chartCanvas, {
      type: "line",
      data: { labels: records.map((r) => r.date.slice(0, 7)), datasets },
      options: { animation: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y, id)}` } } }, scales: { x: { ticks: { maxTicksLimit: 9, maxRotation: 0 }, grid: { display: false } }, y: { ticks: { maxTicksLimit: 6 } } } },
    });
    const n = available.length;
    estado.textContent = `${n} de ${records.length} meses con dato para ${def[1].toLowerCase()}. ${isBiomass ? "La línea une observaciones de crucero solo para visualización; los puntos claros son los meses observados." : "La serie ambiental es continua dentro del periodo descargado."}`;
    byId("monitor-ultimo").textContent = last ? `${fmt(last[id], id)} ${def[2]}` : "—";
    const lastNino = [...records].reverse().find((r) => r.nino12_anom_c != null);
    byId("monitor-nino").textContent = lastNino ? `${fmt(lastNino.nino12_anom_c, "nino12")} °C` : "—";
  }

  variable.addEventListener("change", build);
  escala.addEventListener("change", build);
  build();
})();
