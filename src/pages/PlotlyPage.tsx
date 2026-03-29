import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import type { Config, Data, Layout } from "plotly.js";
// Pre-minified browser build — avoids Vite bundling plotly's Node-only trace helpers.
import Plotly from "plotly.js-dist-min";

/** Plot container shape: flexible heights vs fixed aspect for export / mobile shells. */
export type PlotAspectMode = "flexible" | "16:9" | "4:3" | "1:1";

const PLOT_ASPECT_OPTIONS: readonly { value: PlotAspectMode; label: string }[] = [
  { value: "flexible", label: "Flexible (screen height)" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
] as const;

function plotHostAspectClass(mode: PlotAspectMode): string {
  if (mode === "16:9") return "plot-host--aspect-16x9";
  if (mode === "4:3") return "plot-host--aspect-4x3";
  if (mode === "1:1") return "plot-host--aspect-1x1";
  return "";
}
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import {
  type DesignRow,
  DESIGN_ROWS,
  architectureColor,
  seriesRgbByIndex,
  designArchOrderForRows,
  designBitWidthsForRows,
  designRowsForCategory,
  designRowsForTechnology,
  designTechnologyNodesForRows,
  findDesignRow,
  formatArchLabel,
  rowsByBitWidthOrderedIn,
} from "../data/design";
import {
  BAR_DONUT_BASELINE_OPTIONS,
  DEFAULT_EXPLORE_AXES,
  DESIGN_CATEGORIES,
  designCategoryChartTitle,
  metricSupportsLogScale,
  scatterBaselineTitleQualifier,
  NUMERIC_SCALE_OPTIONS,
  plotlyAxisTypeForMetric,
  SCATTER_AXIS_METRICS,
  scatterArchitectureTickAxis,
  scatter2dPointHoverHtml,
  scatter3dPointHoverHtml,
  scatterAxisHeatmapGrid,
  scatterAxisOptionLabel,
  scatterAxisRange,
  scatterAxisTitle,
  scatterAxisTreemapFlat,
  scatterAxisValue,
  scene3dAxisTickHideEnds,
  syncExploreAxes,
  type BarDonutBaselineMode,
  type ExploreAxesState,
  type DesignCategoryId,
  type ExploreAxisKey,
  type NumericScaleMode,
  type ScatterAxisMetric,
} from "../data/scatterAxisMetrics";
import {
  CHART_LINE_WIDTH,
  CHART_MARKER_OUTLINE_RGB,
  CHART_SCATTER3D_MARKER_LINE_WIDTH,
  CHART_SCATTER_MARKER_LINE_WIDTH,
  chartAxisFontSizePx,
  chartScatterMarkerStrokeRgb,
  getChartPalette,
  plotInsetBackground,
  plotAxisFont,
  plotFont,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyBold,
  plotlyHeatmapColorscale,
  plotlyHoverLabel,
  plotlySceneAxis,
} from "../theme/chartPalette";
import { useTheme } from "../theme/ThemeContext";

/** When a category has more than this many architectures, show design-type checkboxes in Explore metrics. */
const EXPLORE_ARCHITECTURE_FILTER_THRESHOLD = 5;

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
      if (cancelled) return;
      void Plotly.Plots.resize(el);
    });

    const ro = new ResizeObserver(() => {
      if (el && !cancelled) void Plotly.Plots.resize(el);
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

export function PlotlyPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const [exploreAxes, setExploreAxes] = useState<ExploreAxesState>(DEFAULT_EXPLORE_AXES);
  const [plotAspectMode, setPlotAspectMode] = useState<PlotAspectMode>("flexible");
  const [exploreArchitectureSelection, setExploreArchitectureSelection] = useState<string[]>([]);

  const categoryForUi = DESIGN_CATEGORIES.some((c) => c.id === exploreAxes.category)
    ? exploreAxes.category
    : DESIGN_CATEGORIES[0].id;
  const categoryRowsForExplore = useMemo(
    () => designRowsForCategory(DESIGN_ROWS, categoryForUi),
    [categoryForUi],
  );
  const exploreCategoryArchOrder = useMemo(
    () => designArchOrderForRows(categoryRowsForExplore),
    [categoryRowsForExplore],
  );
  const exploreEffectiveArchOrder = useMemo(() => {
    const full = exploreCategoryArchOrder;
    if (full.length <= EXPLORE_ARCHITECTURE_FILTER_THRESHOLD) return full;
    if (exploreArchitectureSelection.length === 0) return full;
    const sel = new Set(exploreArchitectureSelection);
    const filtered = full.filter((a) => sel.has(a));
    return filtered.length > 0 ? filtered : full;
  }, [exploreCategoryArchOrder, exploreArchitectureSelection]);

  useEffect(() => {
    setExploreArchitectureSelection([...exploreCategoryArchOrder]);
  }, [categoryForUi, exploreCategoryArchOrder]);

  const bitWidthOptions = useMemo(
    () => designBitWidthsForRows(categoryRowsForExplore),
    [categoryRowsForExplore],
  );
  const technologyOptions = useMemo(
    () => designTechnologyNodesForRows(categoryRowsForExplore),
    [categoryRowsForExplore],
  );

  /** Keep exploration slice aligned with JSON: only process nodes / bit widths present in this category. */
  useEffect(() => {
    setExploreAxes((prev) => {
      const techOk =
        technologyOptions.length > 0 && technologyOptions.includes(prev.technologyNode);
      const bwOk = bitWidthOptions.length > 0 && bitWidthOptions.includes(prev.bitWidth);
      const technologyNode = techOk
        ? prev.technologyNode
        : technologyOptions[0] ?? prev.technologyNode;
      const bitWidth = bwOk ? prev.bitWidth : bitWidthOptions[0] ?? prev.bitWidth;
      if (technologyNode === prev.technologyNode && bitWidth === prev.bitWidth) {
        return prev;
      }
      return { ...prev, technologyNode, bitWidth };
    });
  }, [categoryForUi, technologyOptions, bitWidthOptions]);
  const barDonutBaselineUi: BarDonutBaselineMode =
    exploreAxes.barDonutBaseline === "bitWidth" || exploreAxes.barDonutBaseline === "technology"
      ? exploreAxes.barDonutBaseline
      : "architecture";
  const barSectionHeading = barDonutBaselineUi === "architecture" ? "Bar chart" : "Grouped bar";

  const onExploreAxisChange = (key: ExploreAxisKey, m: ScatterAxisMetric) => {
    setExploreAxes((prev) => syncExploreAxes(prev, key, m));
  };

  const toggleExploreArchitecture = (arch: string, next: boolean) => {
    setExploreArchitectureSelection((prev) => {
      const resolved =
        prev.length === 0 ? [...exploreCategoryArchOrder] : [...prev];
      const sel = new Set(resolved);
      if (next) {
        sel.add(arch);
      } else {
        if (sel.size <= 1) return resolved;
        sel.delete(arch);
      }
      return exploreCategoryArchOrder.filter((a) => sel.has(a));
    });
  };

  const {
    paretoData,
    paretoLayout,
    paretoConfig,
    barData,
    barLayout,
    barConfig,
    heatmapData,
    heatmapLayout,
    heatmapConfig,
    pieData,
    pieLayout,
    pieConfig,
    scatter3dData,
    scatter3dLayout,
    scatter3dConfig,
    treemapData,
    treemapLayout,
    treemapConfig,
    flexibleHeatmapHostPx,
    flexibleTreemapHostPx,
  } = useMemo(() => {
      const ex = exploreAxes;
      const paretoXMetric = ex.x;
      const paretoYMetric = ex.y;
      const paretoZMetric = ex.z;
      const numericScaleX: NumericScaleMode = ex.numericScaleX === "log" ? "log" : "linear";
      const numericScaleY: NumericScaleMode = ex.numericScaleY === "log" ? "log" : "linear";
      const numericScaleZ: NumericScaleMode = ex.numericScaleZ === "log" ? "log" : "linear";
      const paretoXAxisType = plotlyAxisTypeForMetric(paretoXMetric, numericScaleX);
      const paretoYAxisType = plotlyAxisTypeForMetric(paretoYMetric, numericScaleY);
      const barYAxisType = plotlyAxisTypeForMetric(paretoYMetric, numericScaleY);
      const barHoverYToken =
        numericScaleY === "log" && metricSupportsLogScale(paretoYMetric)
          ? "%{customdata:.3g}"
          : "%{y:.3g}";
      const barYWithLog = (raw: number[]): { y: number[]; customdata?: number[] } => {
        if (numericScaleY !== "log" || !metricSupportsLogScale(paretoYMetric)) {
          return { y: raw };
        }
        return {
          y: raw.map((v) => Math.max(v, 1e-30)),
          customdata: raw,
        };
      };
      const category = DESIGN_CATEGORIES.some((c) => c.id === ex.category)
        ? ex.category
        : DESIGN_CATEGORIES[0].id;
      const categoryRowsAll = designRowsForCategory(DESIGN_ROWS, category);
      const effectiveArchOrder = exploreEffectiveArchOrder;
      const categoryRowsFiltered = categoryRowsAll.filter((r) =>
        effectiveArchOrder.includes(r.architecture),
      );
      const categoryBitWidths = designBitWidthsForRows(categoryRowsAll);
      const categoryTechnologyNodes = designTechnologyNodesForRows(categoryRowsAll);
      const plotBitWidth = (categoryBitWidths as readonly number[]).includes(ex.bitWidth)
        ? ex.bitWidth
        : categoryBitWidths[0];
      /** Technology node for this category’s JSON rows (not the global merged node list). */
      const techNode =
        categoryTechnologyNodes.length > 0 &&
        (categoryTechnologyNodes as readonly string[]).includes(ex.technologyNode)
          ? ex.technologyNode
          : categoryTechnologyNodes[0] ?? ex.technologyNode;
      const barBaseline: BarDonutBaselineMode =
        ex.barDonutBaseline === "bitWidth" || ex.barDonutBaseline === "technology"
          ? ex.barDonutBaseline
          : "architecture";
      /** Rows shown in Pareto + 3D scatter — same slice semantics as bar/donut baseline. */
      const scatterRows: DesignRow[] =
        barBaseline === "architecture"
          ? categoryRowsFiltered.filter(
              (r) => r.processNode === techNode && r.bitWidth === plotBitWidth,
            )
          : barBaseline === "bitWidth"
            ? designRowsForTechnology(categoryRowsFiltered, techNode)
            : categoryRowsFiltered.filter((r) => r.bitWidth === plotBitWidth);
      const rowsFiltered = designRowsForTechnology(categoryRowsFiltered, techNode);
      const palette = getChartPalette(theme);
      const scatterMarkerStroke = chartScatterMarkerStrokeRgb(theme);
      const plotSurfaceBg = plotInsetBackground(theme);
      const hoverLabel = plotlyHoverLabel(palette, narrow);
      const frameX = plotlyAxisFrameX(palette);
      const frameY = plotlyAxisFrameY(palette);
      const sceneAxX = plotlySceneAxis(palette, "grey");
      const sceneAxY = plotlySceneAxis(palette, "black");
      const sceneAxZ = plotlySceneAxis(palette, "grey");
      const axTitle = (label: string) => ({
        text: label,
        font: plotAxisFont(palette.rgbAxisTitle, narrow),
        standoff: narrow ? 10 : 14,
      });
      const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
      /** Uniform marker size (px) for 2D/3D scatters; bit width stays in hover text only. */
      const scatterMarkerSize = 12;

      const byArch = new Map<string, typeof DESIGN_ROWS>();
      for (const row of scatterRows) {
        const list = byArch.get(row.architecture) ?? [];
        list.push(row);
        byArch.set(row.architecture, list);
      }

      const paretoDataInner: Data[] = [];
      for (const arch of effectiveArchOrder) {
        const rows = byArch.get(arch);
        if (!rows?.length) continue;
        const label = formatArchLabel(arch);
        paretoDataInner.push({
          type: "scatter",
          mode: "markers",
          name: label,
          x: rows.map((r) => scatterAxisValue(paretoXMetric, r, effectiveArchOrder)),
          y: rows.map((r) => scatterAxisValue(paretoYMetric, r, effectiveArchOrder)),
          text: rows.map((r) => scatter2dPointHoverHtml(r)),
          hovertemplate: "%{text}<extra></extra>",
          marker: {
            size: scatterMarkerSize,
            color: architectureColor(arch),
            opacity: 1,
            line: { width: CHART_SCATTER_MARKER_LINE_WIDTH, color: scatterMarkerStroke },
          },
        });
      }

      const paretoXRange = scatterAxisRange(paretoXMetric, effectiveArchOrder);
      const paretoYRange = scatterAxisRange(paretoYMetric, effectiveArchOrder);
      const paretoXArchTicks =
        paretoXMetric === "architecture" ? scatterArchitectureTickAxis(effectiveArchOrder) : {};
      const paretoYArchTicks =
        paretoYMetric === "architecture" ? scatterArchitectureTickAxis(effectiveArchOrder) : {};
      const scatterSliceTitle = scatterBaselineTitleQualifier(barBaseline, techNode, plotBitWidth);
      const categoryChartTitle = designCategoryChartTitle(category);
      const paretoTitleText = `${categoryChartTitle}: ${scatterAxisTitle(paretoYMetric)} Vs ${scatterAxisTitle(paretoXMetric)} ${scatterSliceTitle}`;
      const paretoTitleNarrow = plotlyBold(paretoTitleText);
      const paretoTitleWide = plotlyBold(paretoTitleText);

      const paretoLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 42, r: 14, t: 20, b: 56 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: paretoTitleNarrow,
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              zeroline: false,
              type: paretoXAxisType,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(scatterAxisTitle(paretoXMetric)),
              tickfont: axTick,
              ...paretoXArchTicks,
              ...(paretoXRange ? { range: paretoXRange } : {}),
            },
            yaxis: {
              ...frameY,
              zeroline: false,
              type: paretoYAxisType,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              ...paretoYArchTicks,
              ...(paretoYRange ? { range: paretoYRange } : {}),
            },
            hovermode: "closest",
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 48, r: 24, t: 32, b: 56 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: paretoTitleWide,
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              zeroline: false,
              type: paretoXAxisType,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(scatterAxisTitle(paretoXMetric)),
              tickfont: axTick,
              ...paretoXArchTicks,
              ...(paretoXRange ? { range: paretoXRange } : {}),
            },
            yaxis: {
              ...frameY,
              zeroline: false,
              type: paretoYAxisType,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              ...paretoYArchTicks,
              ...(paretoYRange ? { range: paretoYRange } : {}),
            },
            hovermode: "closest",
            hoverlabel: hoverLabel,
          };

      const commonConfig: Partial<Config> = {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        displaylogo: false,
        ...(narrow
          ? { modeBarButtonsToRemove: ["lasso2d", "select2d"] as const }
          : {}),
        toImageButtonOptions: { format: "png", filename: "plotly-chart" },
      };

      const metricAtArchBwProc = (arch: string, bw: number, proc: string): number => {
        const row = findDesignRow(arch, bw, proc);
        return row ? scatterAxisValue(paretoYMetric, row, effectiveArchOrder) : 0;
      };

      const pieSliceColors = (count: number): string[] =>
        Array.from({ length: count }, (_, i) => seriesRgbByIndex(i));

      const rowsAtBw = rowsByBitWidthOrderedIn(
        categoryRowsFiltered,
        effectiveArchOrder,
        plotBitWidth,
        techNode,
      );
      const barGrouped = barBaseline !== "architecture";

      const barLine = { width: CHART_LINE_WIDTH, color: CHART_MARKER_OUTLINE_RGB };

      /** In-bar value copy: short numeric string, then wrapped with Plotly HTML bold. */
      const formatBarInsideValue = (v: number): string => {
        if (!Number.isFinite(v)) return "—";
        if (paretoYMetric === "bitWidth" || paretoYMetric === "architecture") {
          return String(Math.round(v));
        }
        return Number.parseFloat(v.toPrecision(3)).toString();
      };

      const barInsideTextFont = { ...plotAxisFont("#ffffff", narrow), weight: "bold" as const };

      let barDataInner: Data[];
      let barXTitle: string;
      let barTitleNarrow: string;
      let barTitleWide: string;

      if (barBaseline === "architecture") {
        const rawBarY = rowsAtBw.map((r) => scatterAxisValue(paretoYMetric, r, effectiveArchOrder));
        const { y: barYArch, customdata: barCdArch } = barYWithLog(rawBarY);
        barDataInner = [
          {
            type: "bar" as const,
            name: `Metric @ ${plotBitWidth}b`,
            x: rowsAtBw.map((r) => formatArchLabel(r.architecture)),
            y: barYArch,
            ...(barCdArch ? { customdata: barCdArch } : {}),
            text: rowsAtBw.map((r) =>
              plotlyBold(formatBarInsideValue(scatterAxisValue(paretoYMetric, r, effectiveArchOrder))),
            ),
            textposition: "auto",
            textfont: barInsideTextFont,
            marker: {
              color: rowsAtBw.map((r) => architectureColor(r.architecture)),
              line: barLine,
            },
            hovertemplate:
              `<b>%{x}</b><br><b>${scatterAxisTitle(paretoYMetric)}:</b> ${barHoverYToken}<extra></extra>`,
          },
        ];
        barXTitle = "Architecture";
        barTitleNarrow = `${scatterAxisTitle(paretoYMetric)} @ ${plotBitWidth}b (bar)`;
        barTitleWide = `${scatterAxisTitle(paretoYMetric)} at ${plotBitWidth}-bit width (by architecture)`;
      } else if (barBaseline === "bitWidth") {
        const xCat = categoryBitWidths.map((bw) => `${bw}b`);
        barDataInner = effectiveArchOrder.map((arch) => {
          const label = formatArchLabel(arch);
          const rawY = categoryBitWidths.map((bw) => metricAtArchBwProc(arch, bw, techNode));
          const { y: yPlot, customdata: cd } = barYWithLog(rawY);
          return {
            type: "bar" as const,
            name: label,
            x: xCat,
            y: yPlot,
            ...(cd ? { customdata: cd } : {}),
            text: rawY.map((v) => plotlyBold(formatBarInsideValue(v))),
            textposition: "auto",
            textfont: barInsideTextFont,
            marker: {
              color: architectureColor(arch),
              line: barLine,
            },
            hovertemplate:
              `<b>${label}</b><br>%{x}<br><b>${scatterAxisTitle(paretoYMetric)}:</b> ${barHoverYToken}<extra></extra>`,
          };
        });
        barXTitle = "Bit width";
        barTitleNarrow = `${scatterAxisTitle(paretoYMetric)} vs bit width @ ${techNode}`;
        barTitleWide = `${scatterAxisTitle(paretoYMetric)} by bit width (technology baseline ${techNode})`;
      } else {
        const xCat = [...categoryTechnologyNodes];
        barDataInner = effectiveArchOrder.map((arch) => {
          const label = formatArchLabel(arch);
          const rawY = categoryTechnologyNodes.map((proc) =>
            metricAtArchBwProc(arch, plotBitWidth, proc),
          );
          const { y: yPlot, customdata: cd } = barYWithLog(rawY);
          return {
            type: "bar" as const,
            name: label,
            x: xCat,
            y: yPlot,
            ...(cd ? { customdata: cd } : {}),
            text: rawY.map((v) => plotlyBold(formatBarInsideValue(v))),
            textposition: "auto",
            textfont: barInsideTextFont,
            marker: {
              color: architectureColor(arch),
              line: barLine,
            },
            hovertemplate:
              `<b>${label}</b><br>%{x}<br><b>${scatterAxisTitle(paretoYMetric)}:</b> ${barHoverYToken}<extra></extra>`,
          };
        });
        barXTitle = "Technology";
        barTitleNarrow = `${scatterAxisTitle(paretoYMetric)} vs technology @ ${plotBitWidth}b`;
        barTitleWide = `${scatterAxisTitle(paretoYMetric)} by technology (bit-width baseline ${plotBitWidth}b)`;
      }

      const barLegendWide = barGrouped
        ? {
            orientation: "v" as const,
            yanchor: "top" as const,
            y: 1,
            xanchor: "left" as const,
            x: 1.01,
            font: { ...plotAxisFont(palette.rgbAxisTitle, narrow), size: chartAxisFontSizePx(narrow) - 1 },
          }
        : undefined;

      const barLegendNarrow = barGrouped
        ? {
            orientation: "h" as const,
            yanchor: "top" as const,
            y: -0.22,
            xanchor: "center" as const,
            x: 0.5,
            font: { ...plotAxisFont(palette.rgbAxisTitle, narrow), size: 9 },
          }
        : undefined;

      const barMarginRight = barGrouped ? (narrow ? 12 : 220) : narrow ? 14 : 24;
      const barMarginBottom = barGrouped ? (narrow ? 140 : 72) : narrow ? 88 : 72;

      const barLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 46, r: barMarginRight, t: 20, b: barMarginBottom },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(barTitleNarrow),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: barGrouped,
            ...(barGrouped && barLegendNarrow
              ? { legend: barLegendNarrow, barmode: "group" as const }
              : {}),
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(barXTitle),
              tickangle: barBaseline === "technology" ? -42 : -28,
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              type: barYAxisType,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
            },
            hovermode: "x unified",
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 52, r: barMarginRight, t: 32, b: barMarginBottom },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(barTitleWide),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: barGrouped,
            ...(barGrouped && barLegendWide
              ? { legend: barLegendWide, barmode: "group" as const, bargroupgap: 0.08 }
              : {}),
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(barXTitle),
              tickangle: barBaseline === "technology" ? -35 : -18,
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              type: barYAxisType,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
            },
            hovermode: "x unified",
            bargap: barGrouped ? 0.18 : 0.28,
            hoverlabel: hoverLabel,
          };

      let pieDataInner: Data[];
      let pieTitleNarrow: string;
      let pieTitleWide: string;

      /** Inside slices: white on saturated fills. Outside (Plotly auto): theme axis title color on paper/plot bg. */
      const pieInsideTextFont = plotAxisFont("#ffffff", narrow);
      const pieOutsideTextFont = plotAxisFont(palette.rgbAxisTitle, narrow);

      if (barBaseline === "architecture") {
        pieDataInner = [
          {
            type: "pie",
            labels: rowsAtBw.map((r) => formatArchLabel(r.architecture)),
            values: rowsAtBw.map((r) => scatterAxisValue(paretoYMetric, r, effectiveArchOrder)),
            marker: {
              colors: rowsAtBw.map((r) => architectureColor(r.architecture)),
              line: { color: CHART_MARKER_OUTLINE_RGB, width: CHART_LINE_WIDTH },
            },
            hole: 0.38,
            textinfo: "label+percent",
            insidetextfont: pieInsideTextFont,
            outsidetextfont: pieOutsideTextFont,
            hovertemplate:
              "<b>%{label}</b><br><b>Value:</b> %{value:.3g}<br><b>Share:</b> %{percent}<extra></extra>",
          },
        ];
        pieTitleNarrow = `${scatterAxisTitle(paretoYMetric)} share @ ${plotBitWidth}b`;
        pieTitleWide = `${scatterAxisTitle(paretoYMetric)} share at ${plotBitWidth}-bit width (donut)`;
      } else if (barBaseline === "bitWidth") {
        const pieLabels = categoryBitWidths.map((bw) => `${bw}b`);
        const pieValues = categoryBitWidths.map((bw) =>
          effectiveArchOrder.reduce((s, arch) => s + metricAtArchBwProc(arch, bw, techNode), 0),
        );
        pieDataInner = [
          {
            type: "pie",
            labels: pieLabels,
            values: pieValues,
            marker: {
              colors: pieSliceColors(pieLabels.length),
              line: { color: CHART_MARKER_OUTLINE_RGB, width: CHART_LINE_WIDTH },
            },
            hole: 0.38,
            textinfo: "label+percent",
            insidetextfont: pieInsideTextFont,
            outsidetextfont: pieOutsideTextFont,
            hovertemplate:
              "<b>%{label}</b><br><b>Σ architectures:</b> %{value:.3g}<br><b>Share:</b> %{percent}<extra></extra>",
          },
        ];
        pieTitleNarrow = `Σ ${scatterAxisTitle(paretoYMetric)} by bit width @ ${techNode}`;
        pieTitleWide = `${scatterAxisTitle(paretoYMetric)} pooled across architectures @ ${techNode}`;
      } else {
        const pieLabels = [...categoryTechnologyNodes];
        const pieValues = categoryTechnologyNodes.map((proc) =>
          effectiveArchOrder.reduce((s, arch) => s + metricAtArchBwProc(arch, plotBitWidth, proc), 0),
        );
        pieDataInner = [
          {
            type: "pie",
            labels: pieLabels,
            values: pieValues,
            marker: {
              colors: pieSliceColors(pieLabels.length),
              line: { color: CHART_MARKER_OUTLINE_RGB, width: CHART_LINE_WIDTH },
            },
            hole: 0.38,
            textinfo: "label+percent",
            insidetextfont: pieInsideTextFont,
            outsidetextfont: pieOutsideTextFont,
            hovertemplate:
              "<b>%{label}</b><br><b>Σ architectures:</b> %{value:.3g}<br><b>Share:</b> %{percent}<extra></extra>",
          },
        ];
        pieTitleNarrow = `Σ ${scatterAxisTitle(paretoYMetric)} by technology @ ${plotBitWidth}b`;
        pieTitleWide = `${scatterAxisTitle(paretoYMetric)} pooled across architectures @ ${plotBitWidth}b`;
      }

      const pieLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 12, r: 12, t: 20, b: 12 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(pieTitleNarrow),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 16, r: 16, t: 36, b: 16 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(pieTitleWide),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            hoverlabel: hoverLabel,
          };

      const { z: heatZ, colLabels, rowLabels } = scatterAxisHeatmapGrid(
        paretoZMetric,
        techNode,
        {
          sourceRows: categoryRowsFiltered,
          archOrder: effectiveArchOrder,
          bitWidths: categoryBitWidths,
        },
      );
      const heatmapLogZ =
        numericScaleZ === "log" && metricSupportsLogScale(paretoZMetric);
      const heatZPlot = heatmapLogZ
        ? heatZ.map((row) => row.map((v) => (v > 0 ? Math.log10(v) : Number.NaN)))
        : heatZ;
      const heatmapZTitle = heatmapLogZ
        ? `${scatterAxisTitle(paretoZMetric)} (log₁₀)`
        : scatterAxisTitle(paretoZMetric);
      const heatmapDataInner: Data[] = [
        {
          type: "heatmap",
          x: colLabels,
          y: rowLabels,
          z: heatZPlot,
          customdata: heatZ,
          colorscale: plotlyHeatmapColorscale(palette, theme),
          hovertemplate:
            `<b>Bit width %{x}</b><br><b>%{y}</b><br><b>${scatterAxisTitle(paretoZMetric)}:</b> %{customdata}<extra></extra>`,
          colorbar: {
            title: axTitle(heatmapZTitle),
            tickfont: axTick,
          },
        },
      ];

      const heatmapLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 72, r: 18, t: 20, b: 56 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(paretoZMetric)} heatmap${heatmapLogZ ? " (log₁₀ color)" : ""}`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle("Architecture"),
              tickfont: axTick,
            },
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 120, r: 100, t: 32, b: 56 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(paretoZMetric)} — architecture × bit width${heatmapLogZ ? " (log₁₀ color)" : ""}`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle("Architecture"),
              tickfont: axTick,
            },
            hoverlabel: hoverLabel,
          };

      const sceneAxisFor = (
        base: typeof sceneAxX,
        metric: ScatterAxisMetric,
        scale: NumericScaleMode,
      ) => ({
        ...base,
        title: axTitle(scatterAxisTitle(metric)),
        tickfont: axTick,
        ...scene3dAxisTickHideEnds(
          metric,
          scatterRows,
          6,
          effectiveArchOrder,
          categoryBitWidths,
          scale,
        ),
        type: plotlyAxisTypeForMetric(metric, scale),
      });

      const scatter3dDataInner: Data[] = [];
      for (const arch of effectiveArchOrder) {
        const rows = byArch.get(arch);
        if (!rows?.length) continue;
        scatter3dDataInner.push({
          type: "scatter3d",
          mode: "markers",
          name: formatArchLabel(arch),
          x: rows.map((r) => scatterAxisValue(paretoXMetric, r, effectiveArchOrder)),
          y: rows.map((r) => scatterAxisValue(paretoYMetric, r, effectiveArchOrder)),
          z: rows.map((r) => scatterAxisValue(paretoZMetric, r, effectiveArchOrder)),
          text: rows.map((r) => scatter3dPointHoverHtml(r)),
          hovertemplate: "%{text}<extra></extra>",
          marker: {
            size: scatterMarkerSize,
            color: architectureColor(arch),
            opacity: 1,
            line: { width: CHART_SCATTER3D_MARKER_LINE_WIDTH, color: scatterMarkerStroke },
          },
        });
      }

      const scatter3dTitleText = `${categoryChartTitle}: ${scatterAxisTitle(paretoXMetric)} × ${scatterAxisTitle(paretoYMetric)} × ${scatterAxisTitle(paretoZMetric)} ${scatterSliceTitle}`;

      const scatter3dLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 0, r: 0, t: 22, b: 0 },
            paper_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(scatter3dTitleText),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            scene: {
              bgcolor: plotSurfaceBg,
              aspectmode: "cube",
              aspectratio: { x: 1, y: 1, z: 1.15 },
              xaxis: sceneAxisFor(sceneAxX, paretoXMetric, numericScaleX),
              yaxis: sceneAxisFor(sceneAxY, paretoYMetric, numericScaleY),
              zaxis: sceneAxisFor(sceneAxZ, paretoZMetric, numericScaleZ),
            },
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 0, r: 0, t: 34, b: 0 },
            paper_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(scatter3dTitleText),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            scene: {
              bgcolor: plotSurfaceBg,
              aspectmode: "cube",
              aspectratio: { x: 1, y: 1, z: 1.15 },
              xaxis: sceneAxisFor(sceneAxX, paretoXMetric, numericScaleX),
              yaxis: sceneAxisFor(sceneAxY, paretoYMetric, numericScaleY),
              zaxis: sceneAxisFor(sceneAxZ, paretoZMetric, numericScaleZ),
            },
            hoverlabel: hoverLabel,
          };

      const { labels: tmLabels, parents: tmParents, values: tmValues } =
        scatterAxisTreemapFlat(
          paretoYMetric,
          techNode,
          categoryRowsFiltered,
          effectiveArchOrder,
        );
      const treemapLog =
        numericScaleY === "log" && metricSupportsLogScale(paretoYMetric);
      const tmValuesPlot =
        treemapLog && tmValues.length > 1
          ? (() => {
              const leaves = tmValues.slice(1).map((v) => Math.log10(Math.max(v, 1e-30)));
              return [leaves.reduce((a, b) => a + b, 0), ...leaves];
            })()
          : tmValues;
      const treemapColors = [
        palette.axisBorderRgb,
        ...rowsFiltered.map((r) => architectureColor(r.architecture)),
      ];
      const treemapDataInner: Data[] = [
        {
          type: "treemap",
          labels: tmLabels,
          parents: tmParents,
          values: tmValuesPlot,
          textfont: plotAxisFont("#ffffff", narrow),
          marker: { colors: treemapColors },
          hovertemplate: treemapLog
            ? `<b>%{label}</b><br><b>${scatterAxisTitle(paretoYMetric)} (log₁₀):</b> %{value:.3g}<extra></extra>`
            : `<b>%{label}</b><br><b>${scatterAxisTitle(paretoYMetric)}:</b> %{value}<extra></extra>`,
        },
      ];

      const treemapTitleBase = narrow
        ? `${scatterAxisTitle(paretoYMetric)} treemap`
        : `${scatterAxisTitle(paretoYMetric)} — hierarchy`;
      const treemapTitleText = treemapLog ? `${treemapTitleBase} (log₁₀ areas)` : treemapTitleBase;

      const treemapLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 4, r: 4, t: narrow ? 22 : 34, b: 4 },
        paper_bgcolor: plotSurfaceBg,
        plot_bgcolor: plotSurfaceBg,
        font: plotFont(palette.rgbAxisTitle),
        title: {
          text: plotlyBold(treemapTitleText),
          font: plotFont(palette.rgbAxisTitle),
        },
        showlegend: false,
        hoverlabel: hoverLabel,
      };

      const nArchHeat = effectiveArchOrder.length;
      const flexibleHeatmapHostPx = Math.min(920, Math.max(300, 236 + nArchHeat * 28));
      const treemapLeafCount = designRowsForTechnology(categoryRowsAll, techNode).length;
      const flexibleTreemapHostPx = Math.min(
        960,
        Math.max(280, 208 + Math.min(treemapLeafCount, 72) * 13),
      );

      return {
        paretoData: paretoDataInner,
        paretoLayout: paretoLayoutInner,
        paretoConfig: commonConfig,
        barData: barDataInner,
        barLayout: barLayoutInner,
        barConfig: commonConfig,
        heatmapData: heatmapDataInner,
        heatmapLayout: heatmapLayoutInner,
        heatmapConfig: commonConfig,
        pieData: pieDataInner,
        pieLayout: pieLayoutInner,
        pieConfig: commonConfig,
        scatter3dData: scatter3dDataInner,
        scatter3dLayout: scatter3dLayoutInner,
        scatter3dConfig: commonConfig,
        treemapData: treemapDataInner,
        treemapLayout: treemapLayoutInner,
        treemapConfig: commonConfig,
        flexibleHeatmapHostPx,
        flexibleTreemapHostPx,
      };
    }, [narrow, theme, exploreAxes, exploreEffectiveArchOrder]);

  const paretoRef = usePlotlyChart(paretoData, paretoLayout, paretoConfig);
  const scatter3dRef = usePlotlyChart(scatter3dData, scatter3dLayout, scatter3dConfig);
  const heatmapRef = usePlotlyChart(heatmapData, heatmapLayout, heatmapConfig);
  const treemapRef = usePlotlyChart(treemapData, treemapLayout, treemapConfig);
  const pieRef = usePlotlyChart(pieData, pieLayout, pieConfig);
  const barRef = usePlotlyChart(barData, barLayout, barConfig);

  const aspectExtra = plotHostAspectClass(plotAspectMode);
  const heatmapHostPlotStyle: CSSProperties = {
    minHeight: flexibleHeatmapHostPx,
    ...(plotAspectMode === "flexible" ? { height: flexibleHeatmapHostPx } : {}),
  };
  const treemapHostPlotStyle: CSSProperties = {
    minHeight: flexibleTreemapHostPx,
    ...(plotAspectMode === "flexible" ? { height: flexibleTreemapHostPx } : {}),
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      for (const r of [paretoRef, scatter3dRef, heatmapRef, treemapRef, pieRef, barRef]) {
        const el = r.current;
        if (el) void Plotly.Plots.resize(el);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [plotAspectMode, flexibleHeatmapHostPx, flexibleTreemapHostPx]);

  return (
    <div>
      <div className="chart-card">
        <h2>Explore metrics</h2>
        <div className="hint-block">
          <p className="hint">
            <strong>Category</strong> filters the dataset; <strong>Technology</strong> and{" "}
            <strong>Bit width</strong> choices come from that category&apos;s JSON rows (they update when you
            change category).
          </p>
          <p className="hint">
            <strong>Bar / donut / scatter baseline</strong> chooses what stays fixed: architectures at one tech &amp;
            width; sweep <strong>bit widths</strong> with <strong>technology</strong> fixed; or sweep{" "}
            <strong>technology</strong> with <strong>bit width</strong> fixed. Pareto and 3D scatter use the same slice.{" "}
            <strong>Technology</strong> also anchors heatmap and treemap.
          </p>
          <p className="hint">
            <strong>X</strong> / <strong>Y</strong> / <strong>Z</strong> are distinct metrics: scatter and 3D use all
            three; bar and donut use <strong>Y</strong>; treemap uses <strong>Y</strong> at the selected technology;
            heatmap uses <strong>Z</strong> on an architecture × bit-width grid.
          </p>
          <p className="hint">
            At the bottom of the panel: <strong>X</strong>, <strong>Y</strong>, and <strong>Z numeric scale</strong>{" "}
            each choose linear vs log₁₀ independently (<strong>X</strong>/<strong>Y</strong> for Pareto and 3D;{" "}
            <strong>Y</strong> also for bar and treemap; <strong>Z</strong> for heatmap color — hover still shows raw
            values).
          </p>
          <p className="hint">
            <strong>Plot aspect</strong> (last control) sets the frame for every chart for PNG exports (e.g.{" "}
            <strong>4:3</strong>, <strong>16:9</strong>); <strong>Flexible</strong> uses viewport-based heights. Heatmap
            and treemap min-heights grow with row / leaf count; full height locking applies in{" "}
            <strong>Flexible</strong> mode.
          </p>
        </div>
        <div className="axis-pickers">
          <label className="axis-picker">
            Category
            <select
              value={exploreAxes.category}
              aria-label="Dataset category"
              onChange={(e) =>
                setExploreAxes((p) => ({ ...p, category: e.target.value as DesignCategoryId }))
              }
            >
              {DESIGN_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {exploreCategoryArchOrder.length > EXPLORE_ARCHITECTURE_FILTER_THRESHOLD ? (
            <div
              className="explore-arch-filter"
              role="group"
              aria-label="Designs to include in charts for this category"
            >
              <div className="explore-arch-filter__header">
                <span className="explore-arch-filter__title">Designs to include</span>
                <div className="explore-arch-filter__actions">
                  <button
                    type="button"
                    className="explore-arch-filter__action"
                    aria-label="Include all designs in charts"
                    onClick={() =>
                      setExploreArchitectureSelection([...exploreCategoryArchOrder])
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="explore-arch-filter__action"
                    aria-label="Include only the first design in list order"
                    onClick={() => {
                      const first = exploreCategoryArchOrder[0];
                      if (first !== undefined) {
                        setExploreArchitectureSelection([first]);
                      }
                    }}
                  >
                    Unselect all
                  </button>
                </div>
              </div>
              <p className="explore-arch-filter__hint">
                This category has many architecture variants; uncheck to hide designs from Pareto, 3D, heatmap,
                treemap, donut, and bar charts. At least one design stays selected.{" "}
                <strong>Unselect all</strong> keeps only the first design in list order.
              </p>
              <div className="explore-arch-filter__list">
                {exploreCategoryArchOrder.map((arch) => {
                  const checked =
                    exploreArchitectureSelection.length === 0 ||
                    exploreArchitectureSelection.includes(arch);
                  return (
                    <label key={arch} className="explore-arch-filter__item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleExploreArchitecture(arch, e.target.checked)}
                      />
                      <span>{formatArchLabel(arch)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          <label className="axis-picker">
            Bar / donut / scatter baseline
            <select
              value={
                BAR_DONUT_BASELINE_OPTIONS.some((o) => o.value === exploreAxes.barDonutBaseline)
                  ? exploreAxes.barDonutBaseline
                  : "architecture"
              }
              aria-label="Baseline dimension for bar, donut, Pareto, and 3D scatter"
              onChange={(e) =>
                setExploreAxes((p) => ({
                  ...p,
                  barDonutBaseline: e.target.value as BarDonutBaselineMode,
                }))
              }
            >
              {BAR_DONUT_BASELINE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Y (bar, donut, treemap value)
            <select
              value={exploreAxes.y}
              aria-label="Explore metric Y"
              onChange={(e) => onExploreAxisChange("y", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            X (horizontal / 3D depth)
            <select
              value={exploreAxes.x}
              aria-label="Explore metric X"
              onChange={(e) => onExploreAxisChange("x", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Z (heatmap color / 3D vertical)
            <select
              value={exploreAxes.z}
              aria-label="Explore metric Z"
              onChange={(e) => onExploreAxisChange("z", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Technology
            <select
              value={
                technologyOptions.length > 0 &&
                technologyOptions.includes(exploreAxes.technologyNode)
                  ? exploreAxes.technologyNode
                  : technologyOptions[0] ?? exploreAxes.technologyNode
              }
              aria-label="Technology node for heatmap, treemap, bar, and donut"
              onChange={(e) =>
                setExploreAxes((p) => ({ ...p, technologyNode: e.target.value }))
              }
            >
              {technologyOptions.map((node) => (
                <option key={node} value={node}>
                  {node}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Bit width (bar &amp; donut)
            <select
              value={
                bitWidthOptions.includes(exploreAxes.bitWidth)
                  ? exploreAxes.bitWidth
                  : bitWidthOptions[0]
              }
              aria-label="Bit width for bar and donut charts"
              onChange={(e) => {
                const v = Number(e.target.value);
                setExploreAxes((p) =>
                  bitWidthOptions.includes(v) ? { ...p, bitWidth: v } : p,
                );
              }}
            >
              {bitWidthOptions.map((bw) => (
                <option key={bw} value={bw}>
                  {bw}b
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            X numeric scale (Pareto / 3D)
            <select
              value={
                NUMERIC_SCALE_OPTIONS.some((o) => o.value === exploreAxes.numericScaleX)
                  ? exploreAxes.numericScaleX
                  : "linear"
              }
              aria-label="Linear or log base 10 for horizontal axis"
              onChange={(e) =>
                setExploreAxes((p) => ({ ...p, numericScaleX: e.target.value as NumericScaleMode }))
              }
            >
              {NUMERIC_SCALE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Y numeric scale (Pareto / 3D / bar / treemap)
            <select
              value={
                NUMERIC_SCALE_OPTIONS.some((o) => o.value === exploreAxes.numericScaleY)
                  ? exploreAxes.numericScaleY
                  : "linear"
              }
              aria-label="Linear or log base 10 for vertical value axis"
              onChange={(e) =>
                setExploreAxes((p) => ({ ...p, numericScaleY: e.target.value as NumericScaleMode }))
              }
            >
              {NUMERIC_SCALE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Z numeric scale (heatmap color / 3D)
            <select
              value={
                NUMERIC_SCALE_OPTIONS.some((o) => o.value === exploreAxes.numericScaleZ)
                  ? exploreAxes.numericScaleZ
                  : "linear"
              }
              aria-label="Linear or log base 10 for Z axis and heatmap color"
              onChange={(e) =>
                setExploreAxes((p) => ({ ...p, numericScaleZ: e.target.value as NumericScaleMode }))
              }
            >
              {NUMERIC_SCALE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Plot aspect (all charts)
            <select
              value={PLOT_ASPECT_OPTIONS.some((o) => o.value === plotAspectMode) ? plotAspectMode : "flexible"}
              aria-label="Aspect ratio for all plot frames and downloads"
              onChange={(e) => setPlotAspectMode(e.target.value as PlotAspectMode)}
            >
              {PLOT_ASPECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Pinch/drag or mode-bar zoom. Points follow <strong>Bar / donut / scatter baseline</strong> (fixed technology &amp;
          width, sweep bit width at fixed technology, or sweep technology at fixed width). Hover for details.{" "}
        </p>
        <div className={`plot-host ${aspectExtra}`.trim()}>
          <div ref={paretoRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>3D scatter</h2>
        <p className="hint">
          WebGL cloud using <strong>X</strong> × <strong>Y</strong> × <strong>Z</strong> from above; same row slice as
          Pareto (see <strong>Bar / donut / scatter baseline</strong>). Drag to rotate; mode bar for PNG / reset camera.
        </p>
        <div className={`plot-host plot-host--3d ${aspectExtra}`.trim()}>
          <div ref={scatter3dRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Heatmap</h2>
        <p className="hint">
          Cell color = <strong>Z</strong> metric across architecture × bit width at the selected{" "}
          <strong>technology</strong>.
        </p>
        <div className={`plot-host ${aspectExtra}`.trim()} style={heatmapHostPlotStyle}>
          <div ref={heatmapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Treemap</h2>
        <p className="hint">
          Tile size from <strong>Y</strong> metric — root → each architecture×width leaf at the selected{" "}
          <strong>technology</strong>.
        </p>
        <div
          className={["plot-host", plotAspectMode !== "flexible" && "plot-host--short", aspectExtra]
            .filter(Boolean)
            .join(" ")}
          style={treemapHostPlotStyle}
        >
          <div ref={treemapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Donut (pie)</h2>
        <p className="hint">
          Shares follow <strong>Bar / donut baseline</strong>: per architecture at fixed technology &amp; width, or pooled Σ{" "}
          <strong>Y</strong> across architectures over bit widths (technology baseline) or over technology nodes (bit-width
          baseline).
        </p>
        <div className={`plot-host plot-host--short ${aspectExtra}`.trim()}>
          <div ref={pieRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>{barSectionHeading}</h2>
        <p className="hint">
          Uses the same <strong>Bar / donut / scatter baseline</strong> as Pareto and donut: one bar per architecture at the
          chosen technology and bit width; or <strong>grouped</strong> bars across bit widths (technology baseline); or
          grouped across technology (bit-width baseline). Values are <strong>Y</strong>. Mode bar: zoom, pan, autoscale,
          PNG.
        </p>
        <div className={`plot-host ${aspectExtra}`.trim()}>
          <div ref={barRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}
