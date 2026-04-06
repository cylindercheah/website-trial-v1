import {
  useMemo,
  useRef,
  useState,
  useEffect,
  type RefObject,
  type JSX,
} from "react";
import type { Config, Data, Layout } from "plotly.js";
import Plotly from "plotly.js-dist-min";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import { useTheme } from "../theme/ThemeContext";
import {
  ANALOG_METRICS,
  ANALOG_SCATTER_METRIC_KEYS,
  analogTechnologyOptions,
  analogYearBounds,
  applyAnalogFilters,
  buildDefaultAnalogFilters,
  metricLabel,
  rowQualityBadges,
  sortAnalogRows,
  type AnalogFilterState,
  type AnalogSortState,
} from "../data/analogMetrics";
import type { AnalogMetricKey, AnalogReferenceType } from "../data/analogTypes";
import { ANALOG_FOOTNOTES, ANALOG_VOLTAGE_REF_ROWS } from "../data/analogVoltageRefRows";
import {
  buildAnalogCoverageHeatmap,
  buildAnalogScatter2D,
  buildAnalogScatter3D,
  type AxisScaleMode,
} from "../data/analogPlotBuilders";

type ExplorerMode = "2d" | "3d";

function usePlotlyChart(
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const plot = Plotly.newPlot(el, data, layout, config);
    void plot.then(() => {
      if (!cancelled) void Plotly.Plots.resize(el);
    });

    const ro = new ResizeObserver(() => {
      if (!cancelled) void Plotly.Plots.resize(el);
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      ro.disconnect();
      void Plotly.purge(el);
    };
  }, [data, layout, config]);

  return ref;
}

function toggleTypeInFilter(
  prev: AnalogFilterState,
  type: AnalogReferenceType,
  checked: boolean,
): AnalogFilterState {
  const nextSet = new Set(prev.types);
  if (checked) nextSet.add(type);
  else if (nextSet.size > 1) nextSet.delete(type);
  return { ...prev, types: ["2T", "SCM", "Hybrid"].filter((t) => nextSet.has(t as AnalogReferenceType)) as AnalogReferenceType[] };
}

export function AnalogPage(): JSX.Element {
  const { theme } = useTheme();
  const narrow = useNarrowScreen(640);

  const bounds = useMemo(() => analogYearBounds(ANALOG_VOLTAGE_REF_ROWS), []);
  const techOptions = useMemo(() => analogTechnologyOptions(ANALOG_VOLTAGE_REF_ROWS), []);

  const [filters, setFilters] = useState<AnalogFilterState>(buildDefaultAnalogFilters);
  const [sortState, setSortState] = useState<AnalogSortState>({ key: "year", direction: "desc" });
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>("3d");
  const [explorerX, setExplorerX] = useState<AnalogMetricKey>("powerPw");
  const [explorerY, setExplorerY] = useState<AnalogMetricKey>("tcPpmPerC");
  const [explorerZ, setExplorerZ] = useState<AnalogMetricKey>("vminV");
  const [xScale, setXScale] = useState<AxisScaleMode>("linear");
  const [yScale, setYScale] = useState<AxisScaleMode>("linear");
  const [zScale, setZScale] = useState<AxisScaleMode>("linear");

  const filteredRows = useMemo(
    () => applyAnalogFilters(ANALOG_VOLTAGE_REF_ROWS, filters),
    [filters],
  );
  const sortedRows = useMemo(() => sortAnalogRows(filteredRows, sortState), [filteredRows, sortState]);

  const scatterPowerTc = useMemo(
    () =>
      buildAnalogScatter2D({
        title: "Untrimmed TC vs Power",
        rows: filteredRows,
        xMetric: "powerPw",
        yMetric: "tcPpmPerC",
        xScale,
        yScale,
        theme,
        narrow,
      }),
    [filteredRows, xScale, yScale, theme, narrow],
  );
  const scatterVminPower = useMemo(
    () =>
      buildAnalogScatter2D({
        title: "Power vs Minimum Supply",
        rows: filteredRows,
        xMetric: "vminV",
        yMetric: "powerPw",
        xScale,
        yScale,
        theme,
        narrow,
      }),
    [filteredRows, xScale, yScale, theme, narrow],
  );
  const scatterPssrPower = useMemo(
    () =>
      buildAnalogScatter2D({
        title: "Power vs PSRR",
        rows: filteredRows,
        xMetric: "psrrDb",
        yMetric: "powerPw",
        xScale,
        yScale,
        theme,
        narrow,
      }),
    [filteredRows, xScale, yScale, theme, narrow],
  );

  const explorerPlot = useMemo(() => {
    if (explorerMode === "2d") {
      return buildAnalogScatter2D({
        title: "Metric Explorer (2D)",
        rows: filteredRows,
        xMetric: explorerX,
        yMetric: explorerY,
        xScale,
        yScale,
        theme,
        narrow,
      });
    }
    return buildAnalogScatter3D({
      title: "Metric Explorer (3D)",
      rows: filteredRows,
      xMetric: explorerX,
      yMetric: explorerY,
      zMetric: explorerZ,
      xScale,
      yScale,
      zScale,
      theme,
      narrow,
    });
  }, [explorerMode, filteredRows, explorerX, explorerY, explorerZ, xScale, yScale, zScale, theme, narrow]);

  const coverageHeatmap = useMemo(
    () => buildAnalogCoverageHeatmap(filteredRows, theme, narrow),
    [filteredRows, theme, narrow],
  );

  const powerTcRef = usePlotlyChart(scatterPowerTc.data, scatterPowerTc.layout, scatterPowerTc.config);
  const vminPowerRef = usePlotlyChart(
    scatterVminPower.data,
    scatterVminPower.layout,
    scatterVminPower.config,
  );
  const psrrPowerRef = usePlotlyChart(
    scatterPssrPower.data,
    scatterPssrPower.layout,
    scatterPssrPower.config,
  );
  const explorerRef = usePlotlyChart(explorerPlot.data, explorerPlot.layout, explorerPlot.config);
  const heatmapRef = usePlotlyChart(
    coverageHeatmap.data,
    coverageHeatmap.layout,
    coverageHeatmap.config,
  );

  const onSort = (key: AnalogSortState["key"]) => {
    setSortState((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortArrow = (key: AnalogSortState["key"]): string =>
    sortState.key === key ? (sortState.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <div>
      <div className="chart-card">
        <h2>Analog Circuits - Explore Metrics</h2>
        <div className="hint-block">
          <p className="hint">
            Filter rows by topology, year, technology node, simulation inclusion, and trim state.
          </p>
          <p className="hint">
            Curated 2D plots keep high-value comparisons readable; the metric explorer supports custom 2D/3D combinations for deeper tradeoff study.
          </p>
        </div>
        <div className="axis-pickers analog-controls">
          <div className="analog-type-group" role="group" aria-label="Topology type filter">
            {(["2T", "SCM", "Hybrid"] as const).map((type) => {
              const checked = filters.types.includes(type);
              return (
                <label key={type} className="analog-checkbox">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setFilters((prev) => toggleTypeInFilter(prev, type, e.target.checked))
                    }
                  />
                  <span>{type}</span>
                </label>
              );
            })}
          </div>

          <label className="axis-picker">
            Year min
            <input
              type="number"
              min={bounds.min}
              max={filters.yearMax}
              value={filters.yearMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFilters((prev) => ({ ...prev, yearMin: Math.max(bounds.min, Math.min(v, prev.yearMax)) }));
              }}
            />
          </label>

          <label className="axis-picker">
            Year max
            <input
              type="number"
              min={filters.yearMin}
              max={bounds.max}
              value={filters.yearMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFilters((prev) => ({ ...prev, yearMax: Math.min(bounds.max, Math.max(v, prev.yearMin)) }));
              }}
            />
          </label>

          <label className="axis-picker">
            Technology
            <select
              value={String(filters.technologyNm)}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  technologyNm: e.target.value === "all" ? "all" : Number(e.target.value),
                }))
              }
            >
              <option value="all">All</option>
              {techOptions.map((nm) => (
                <option key={nm} value={nm}>
                  {nm}nm
                </option>
              ))}
            </select>
          </label>

          <label className="axis-picker">
            Result source
            <select
              value={filters.includeSimulated ? "all" : "measured"}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, includeSimulated: e.target.value === "all" }))
              }
            >
              <option value="all">Measured + simulated</option>
              <option value="measured">Measured-focused</option>
            </select>
          </label>

          <label className="axis-picker">
            Trim filter
            <select
              value={filters.trimState}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  trimState: e.target.value as AnalogFilterState["trimState"],
                }))
              }
            >
              <option value="all">All</option>
              <option value="untrimmed">Untrimmed</option>
              <option value="trimmed">Trimmed</option>
            </select>
          </label>

          <label className="axis-picker">
            X scale
            <select value={xScale} onChange={(e) => setXScale(e.target.value as AxisScaleMode)}>
              <option value="linear">Linear</option>
              <option value="log">Log10</option>
            </select>
          </label>

          <label className="axis-picker">
            Y scale
            <select value={yScale} onChange={(e) => setYScale(e.target.value as AxisScaleMode)}>
              <option value="linear">Linear</option>
              <option value="log">Log10</option>
            </select>
          </label>
        </div>
      </div>

      <div className="chart-card">
        <h2>Curated 2D: Untrimmed TC vs Power</h2>
        <p className="hint">Shows energy-temperature tradeoff across 2T, SCM, and Hybrid classes.</p>
        <div className="plot-host">
          <div ref={powerTcRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      <div className="chart-card">
        <h2>Curated 2D: Power vs Minimum Supply</h2>
        <p className="hint">Highlights low-voltage operation against picowatt power budgets.</p>
        <div className="plot-host">
          <div ref={vminPowerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      <div className="chart-card">
        <h2>Curated 2D: Power vs PSRR</h2>
        <p className="hint">Shows rejection-power tradeoff where PSRR is available.</p>
        <div className="plot-host">
          <div ref={psrrPowerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      <div className="chart-card">
        <h2>Configurable Metric Explorer</h2>
        <div className="axis-pickers analog-controls">
          <label className="axis-picker">
            View
            <select value={explorerMode} onChange={(e) => setExplorerMode(e.target.value as ExplorerMode)}>
              <option value="2d">2D scatter</option>
              <option value="3d">3D scatter</option>
            </select>
          </label>

          <label className="axis-picker">
            X metric
            <select
              value={explorerX}
              onChange={(e) => setExplorerX(e.target.value as AnalogMetricKey)}
            >
              {ANALOG_SCATTER_METRIC_KEYS.map((k) => (
                <option key={k} value={k}>
                  {metricLabel(k)}
                </option>
              ))}
            </select>
          </label>

          <label className="axis-picker">
            Y metric
            <select
              value={explorerY}
              onChange={(e) => setExplorerY(e.target.value as AnalogMetricKey)}
            >
              {ANALOG_SCATTER_METRIC_KEYS.map((k) => (
                <option key={k} value={k}>
                  {metricLabel(k)}
                </option>
              ))}
            </select>
          </label>

          {explorerMode === "3d" ? (
            <>
              <label className="axis-picker">
                Z metric
                <select
                  value={explorerZ}
                  onChange={(e) => setExplorerZ(e.target.value as AnalogMetricKey)}
                >
                  {ANALOG_SCATTER_METRIC_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {metricLabel(k)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="axis-picker">
                Z scale
                <select value={zScale} onChange={(e) => setZScale(e.target.value as AxisScaleMode)}>
                  <option value="linear">Linear</option>
                  <option value="log">Log10</option>
                </select>
              </label>
            </>
          ) : null}
        </div>
        <p className="hint">
          The explorer only plots rows that contain complete values for selected axes.
        </p>
        <div className={`plot-host ${explorerMode === "3d" ? "plot-host--3d" : ""}`.trim()}>
          <div ref={explorerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      <div className="chart-card">
        <h2>Coverage Heatmap</h2>
        <p className="hint">Paper count by publication year and topology type under current filters.</p>
        <div className="plot-host">
          <div ref={heatmapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      <div className="chart-card">
        <h2>Benchmark Table</h2>
        <p className="hint">Sortable full benchmark rows with quality tags and notes.</p>
        <div className="analog-table-wrap">
          <table className="analog-table">
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => onSort("type")}>
                    Type {sortArrow("type")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => onSort("year")}>
                    Year {sortArrow("year")}
                  </button>
                </th>
                <th>Reference</th>
                <th>
                  <button type="button" onClick={() => onSort("technologyNm")}>
                    Tech (nm) {sortArrow("technologyNm")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => onSort("powerPw")}>
                    Power (pW) {sortArrow("powerPw")}
                  </button>
                </th>
                <th>VREF (mV)</th>
                <th>
                  <button type="button" onClick={() => onSort("vminV")}>
                    Min Supply (V) {sortArrow("vminV")}
                  </button>
                </th>
                <th>sigma/mu (%)</th>
                <th>PSRR (dB)</th>
                <th>LS (%/V)</th>
                <th>Cap (pF)</th>
                <th>Temp (C)</th>
                <th>
                  <button type="button" onClick={() => onSort("tcPpmPerC")}>
                    TC (ppm/C) {sortArrow("tcPpmPerC")}
                  </button>
                </th>
                <th>Size (um^2)</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.type}</td>
                  <td>{row.year}</td>
                  <td>
                    {row.referenceUrl ? (
                      <a
                        href={row.referenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={row.referenceUrl}
                      >
                        <code>{row.refKey}</code>
                      </a>
                    ) : (
                      <code>{row.refKey}</code>
                    )}
                  </td>
                  <td>{row.technologyNm}</td>
                  <td>{row.powerPw ?? "N/A"}</td>
                  <td>{row.vrefMv ?? "N/A"}</td>
                  <td>{row.vminV ?? "N/A"}</td>
                  <td>{row.sigmaOverMuPct ?? "N/A"}</td>
                  <td>
                    {row.psrrDb ?? "N/A"}
                    {row.psrrAtHz ? ` @${row.psrrAtHz}Hz` : row.psrrNote ? ` (${row.psrrNote})` : ""}
                  </td>
                  <td>{row.lsPctPerV ?? "N/A"}</td>
                  <td>{row.capPf ?? "No"}</td>
                  <td>
                    {row.tempMinC ?? "N/A"} to {row.tempMaxC ?? "N/A"}
                  </td>
                  <td>{row.tcPpmPerC ?? "N/A"}</td>
                  <td>{row.sizeUm2 ?? "N/A"}</td>
                  <td>
                    <div className="analog-tags">
                      {rowQualityBadges(row).map((tag) => (
                        <span key={tag} className="analog-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="note">
          {ANALOG_FOOTNOTES.map((note) => (
            <div key={note}>{note}</div>
          ))}
        </div>
      </div>

      <div className="note">
        Rows shown: {sortedRows.length} / {ANALOG_VOLTAGE_REF_ROWS.length}. Metrics available for explorer:{" "}
        {ANALOG_METRICS.map((m) => m.label).join(", ")}.
      </div>
    </div>
  );
}

