import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption, ToolboxComponentOption } from "echarts";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import {
  ADDER_DEMO_ROWS,
  architectureColor,
  DEMO_ARCH_ORDER,
  fmaxMhzHeatmapGrid,
  formatArchLabel,
  funnelStepsByFmax,
  ppaHierarchyTree,
  radarMetrics64Normalized,
  rowsByBitWidthOrdered,
  syntheticPowerBoxByArch64,
} from "../data/samplePpa";
import {
  SCATTER_AXIS_METRICS,
  scatterAxisDisplayValue,
  scatterAxisOptionLabel,
  scatterAxisRange,
  scatterAxisTitle,
  scatterAxisValue,
  type ScatterAxisMetric,
} from "../data/scatterAxisMetrics";
import {
  CHART_LINE_WIDTH,
  echartsGridBorder,
  echartsTextStyle,
  getChartPalette,
  type ChartPalette,
  type ThemeMode,
} from "../theme/chartPalette";
import { useTheme } from "../theme/ThemeContext";

function echartsToolbox(
  palette: ChartPalette,
  theme: ThemeMode,
  narrow: boolean,
  pngName: string,
  opts?: {
    dataZoom?: { xAxisIndex?: number[] | false; yAxisIndex?: number[] | false };
    magicType?: { type: ("line" | "bar" | "stack")[] };
  },
): ToolboxComponentOption {
  const bg = theme === "dark" ? "#131b26" : "#fafafa";
  return {
    right: narrow ? 4 : 8,
    top: narrow ? 4 : 8,
    iconStyle: { borderColor: palette.rgbAxisTick },
    emphasis: { iconStyle: { borderColor: palette.rgbAxisTitle } },
    feature: {
      ...(opts?.dataZoom
        ? {
            dataZoom: {
              xAxisIndex: opts.dataZoom.xAxisIndex ?? false,
              yAxisIndex: opts.dataZoom.yAxisIndex ?? false,
              filterMode: "none",
            },
          }
        : {}),
      ...(opts?.magicType
        ? {
            magicType: {
              type: opts.magicType.type,
              title: { line: "Line", bar: "Bar", stack: "Stack" },
            },
          }
        : {}),
      restore: { title: "Reset zoom" },
      saveAsImage: {
        title: "Save as PNG",
        name: pngName,
        backgroundColor: bg,
      },
    },
  };
}

type ScatterDatum = {
  value: [number, number];
  bitWidth: number;
  areaUm2: number;
};

export function EChartsPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const [paretoXMetric, setParetoXMetric] = useState<ScatterAxisMetric>("fmaxMhz");
  const [paretoYMetric, setParetoYMetric] = useState<ScatterAxisMetric>("powerMw");

  const onParetoXMetricChange = (m: ScatterAxisMetric) => {
    setParetoXMetric(m);
    if (m === paretoYMetric) {
      const next = SCATTER_AXIS_METRICS.find((x) => x !== m);
      if (next) setParetoYMetric(next);
    }
  };
  const onParetoYMetricChange = (m: ScatterAxisMetric) => {
    setParetoYMetric(m);
    if (m === paretoXMetric) {
      const next = SCATTER_AXIS_METRICS.find((x) => x !== m);
      if (next) setParetoXMetric(next);
    }
  };

  const paretoOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const byArch = new Map<string, typeof ADDER_DEMO_ROWS>();
    for (const row of ADDER_DEMO_ROWS) {
      const list = byArch.get(row.architecture) ?? [];
      list.push(row);
      byArch.set(row.architecture, list);
    }

    const bump = narrow ? 5 : 0;
    const chartPlotBg = theme === "dark" ? "rgb(22, 28, 38)" : "rgb(255, 255, 255)";

    // Numeric x + y require value axes (default xAxis is "category", which hides scatter).
    const series = DEMO_ARCH_ORDER.flatMap((arch) => {
      const rows = byArch.get(arch);
      if (!rows?.length) return [];
      const label = formatArchLabel(arch);
      return [
        {
          name: label,
          type: "scatter" as const,
          z: 10,
          itemStyle: {
            color: architectureColor(arch),
            opacity: 1,
            borderColor: palette.axisBorderRgb,
            borderWidth: 1,
          },
          emphasis: { focus: "series" as const },
          data: rows.map((r) => ({
            value: [
              scatterAxisValue(paretoXMetric, r),
              scatterAxisValue(paretoYMetric, r),
            ] as [number, number],
            // Per-point size: symbolSize callbacks receive [x,y], not this object (bitWidth was undefined → broken plot).
            symbolSize: bump + 10 + (r.bitWidth / 64) * 14,
            bitWidth: r.bitWidth,
            areaUm2: r.areaUm2,
          })),
        },
      ];
    });

    const paretoXAxisRange = scatterAxisRange(paretoXMetric);
    const paretoYAxisRange = scatterAxisRange(paretoYMetric);

    return {
      backgroundColor: chartPlotBg,
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow
          ? `${scatterAxisTitle(paretoXMetric)} vs ${scatterAxisTitle(paretoYMetric)} (demo)`
          : `Pareto-style: ${scatterAxisTitle(paretoXMetric)} vs ${scatterAxisTitle(paretoYMetric)} (demo data)`,
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      grid: narrow
        ? {
            left: "14%",
            right: "8%",
            top: "20%",
            bottom: "34%",
            containLabel: true,
            ...echartsGridBorder(palette),
          }
        : {
            left: "12%",
            right: "6%",
            top: "18%",
            bottom: "22%",
            containLabel: true,
            ...echartsGridBorder(palette),
          },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-pareto", {
        dataZoom: { xAxisIndex: [0], yAxisIndex: [0] },
      }),
      tooltip: {
        trigger: "item",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
        formatter: (params: unknown) => {
          const p = params as {
            seriesName?: string;
            data?: ScatterDatum;
          };
          const d = p.data;
          if (!d?.value) return "";
          const [vx, vy] = d.value;
          return `${p.seriesName ?? ""}<br/>${scatterAxisTitle(paretoXMetric)}: ${scatterAxisDisplayValue(paretoXMetric, vx)}<br/>${scatterAxisTitle(paretoYMetric)}: ${scatterAxisDisplayValue(paretoYMetric, vy)}<br/>Width: ${d.bitWidth} b<br/>Area: ${d.areaUm2} µm²`;
        },
      },
      legend: { show: false },
      xAxis: {
        type: "value",
        name: scatterAxisTitle(paretoXMetric),
        nameLocation: "middle",
        nameGap: narrow ? 22 : 28,
        scale: true,
        axisLabel: {
          ...echartsTextStyle(palette.axisValueLabelRgb),
          ...(paretoXMetric === "architecture"
            ? {
                formatter: (v: number) => scatterAxisDisplayValue("architecture", v),
              }
            : {}),
        },
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitLine: {
          lineStyle: {
            color: palette.axisGridGreyRgb,
            width: CHART_LINE_WIDTH,
            type: "dashed",
          },
        },
        ...(paretoXAxisRange
          ? { min: paretoXAxisRange[0], max: paretoXAxisRange[1] }
          : {}),
      },
      yAxis: {
        type: "value",
        name: scatterAxisTitle(paretoYMetric),
        nameLocation: "middle",
        nameGap: narrow ? 32 : 40,
        scale: true,
        axisLabel: {
          ...echartsTextStyle(palette.axisValueLabelRgb),
          ...(paretoYMetric === "architecture"
            ? {
                formatter: (v: number) => scatterAxisDisplayValue("architecture", v),
              }
            : {}),
        },
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitLine: {
          lineStyle: {
            color: palette.axisGridBlackRgb,
            width: CHART_LINE_WIDTH,
            type: "dashed",
          },
        },
        ...(paretoYAxisRange
          ? { min: paretoYAxisRange[0], max: paretoYAxisRange[1] }
          : {}),
      },
      series,
      dataZoom: [
        { type: "inside", xAxisIndex: 0, yAxisIndex: 0, filterMode: "none" },
        {
          type: "slider",
          xAxisIndex: 0,
          filterMode: "none",
          height: narrow ? 32 : 22,
          bottom: narrow ? 8 : 36,
          moveHandleSize: narrow ? 10 : 7,
          textStyle: echartsTextStyle(palette.rgbAxisTick),
        },
      ],
      media: [
        {
          query: { maxWidth: 640 },
          option: {
            grid: {
              bottom: "36%",
              left: "16%",
              right: "10%",
              ...echartsGridBorder(palette),
            },
            legend: { show: false },
          },
        },
      ],
    };
  }, [narrow, theme]);

  const lineOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const ks = ADDER_DEMO_ROWS.filter((r) => r.architecture === "kogge_stone").sort(
      (a, b) => a.bitWidth - b.bitWidth,
    );
    const bw = ks.map((r) => r.bitWidth);

    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Kogge-Stone scaling" : "Scaling: Kogge-Stone vs bit width",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      grid: narrow
        ? {
            left: "16%",
            right: "18%",
            top: "20%",
            bottom: "42%",
            containLabel: true,
            ...echartsGridBorder(palette),
          }
        : {
            left: "12%",
            right: "14%",
            top: "18%",
            bottom: "24%",
            containLabel: true,
            ...echartsGridBorder(palette),
          },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-scaling", {
        dataZoom: { xAxisIndex: [0], yAxisIndex: false },
      }),
      tooltip: {
        trigger: "axis",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      legend: {
        bottom: narrow ? 52 : 0,
        data: ["Fmax (MHz)", "Area (µm²)"],
        textStyle: echartsTextStyle(palette.rgbAxisTick),
        itemGap: narrow ? 12 : 16,
      },
      xAxis: {
        type: "category",
        data: bw,
        name: "Bit width",
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLabel: echartsTextStyle(palette.axisValueLabelRgb),
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: palette.axisGridGreyRgb,
            width: CHART_LINE_WIDTH,
            type: "dashed",
          },
        },
      },
      yAxis: [
        {
          type: "value",
          name: "Fmax (MHz)",
          position: "left",
          nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
          axisLabel: echartsTextStyle(palette.axisValueLabelRgb),
          axisLine: {
            show: true,
            lineStyle: {
              color: architectureColor("kogge_stone"),
              width: CHART_LINE_WIDTH,
            },
          },
          splitLine: {
            lineStyle: {
              color: palette.axisGridBlackRgb,
              width: CHART_LINE_WIDTH,
              type: "dashed",
            },
          },
        },
        {
          type: "value",
          name: "Area (µm²)",
          position: "right",
          nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
          axisLabel: echartsTextStyle(palette.axisValueLabelRgb),
          axisLine: {
            show: true,
            lineStyle: { color: "rgb(139, 69, 19)", width: CHART_LINE_WIDTH },
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Fmax (MHz)",
          type: "line",
          yAxisIndex: 0,
          data: ks.map((r) => r.fmaxMhz),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: CHART_LINE_WIDTH, color: architectureColor("kogge_stone") },
        },
        {
          name: "Area (µm²)",
          type: "line",
          yAxisIndex: 1,
          data: ks.map((r) => r.areaUm2),
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: CHART_LINE_WIDTH,
            type: "dashed",
            color: "rgb(139, 69, 19)",
          },
        },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        {
          type: "slider",
          xAxisIndex: 0,
          height: narrow ? 32 : 22,
          bottom: narrow ? 8 : 36,
          moveHandleSize: narrow ? 10 : 7,
          textStyle: echartsTextStyle(palette.rgbAxisTick),
        },
      ],
      media: [
        {
          query: { maxWidth: 480 },
          option: {
            grid: { bottom: "44%", ...echartsGridBorder(palette) },
            dataZoom: [
              { type: "inside", xAxisIndex: 0, filterMode: "none" },
              {
                type: "slider",
                xAxisIndex: 0,
                height: 34,
                bottom: 6,
                moveHandleSize: 12,
              },
            ],
          },
        },
      ],
    };
  }, [narrow, theme]);

  const barOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const rows64 = rowsByBitWidthOrdered(64);
    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Power @ 64b (bar)" : "Power at 64-bit width (by architecture)",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      grid: narrow
        ? {
            left: "14%",
            right: "10%",
            top: "22%",
            bottom: "32%",
            containLabel: true,
            ...echartsGridBorder(palette),
          }
        : {
            left: "10%",
            right: "8%",
            top: "18%",
            bottom: "20%",
            containLabel: true,
            ...echartsGridBorder(palette),
          },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-bar-64", {
        dataZoom: { xAxisIndex: [0], yAxisIndex: false },
        magicType: { type: ["line", "bar"] },
      }),
      tooltip: {
        trigger: "axis",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: rows64.map((r) => formatArchLabel(r.architecture)),
        name: "Architecture",
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLabel: {
          ...echartsTextStyle(palette.axisValueLabelRgb),
          rotate: narrow ? 28 : 16,
        },
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: palette.axisGridGreyRgb,
            width: CHART_LINE_WIDTH,
            type: "dashed",
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Power (mW)",
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLabel: echartsTextStyle(palette.axisValueLabelRgb),
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitLine: {
          lineStyle: {
            color: palette.axisGridBlackRgb,
            width: CHART_LINE_WIDTH,
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "Power (mW)",
          type: "bar",
          barMaxWidth: narrow ? 36 : 48,
          data: rows64.map((r) => ({
            value: r.powerMw,
            itemStyle: { color: architectureColor(r.architecture) },
          })),
          label: {
            show: true,
            position: "top",
            ...echartsTextStyle(palette.rgbAxisTick),
            formatter: (p) => {
              const v = (p as { value?: number }).value;
              return v != null ? `${v} mW` : "";
            },
          },
        },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        {
          type: "slider",
          xAxisIndex: 0,
          filterMode: "none",
          height: narrow ? 26 : 20,
          bottom: narrow ? 6 : 10,
          moveHandleSize: narrow ? 10 : 7,
          textStyle: echartsTextStyle(palette.rgbAxisTick),
        },
      ],
    };
  }, [narrow, theme]);

  const heatmapOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const { z, colLabels, rowLabels } = fmaxMhzHeatmapGrid();
    const cells: [number, number, number][] = [];
    for (let i = 0; i < z.length; i++) {
      for (let j = 0; j < z[i].length; j++) {
        cells.push([j, i, z[i][j]]);
      }
    }
    const flat = z.flat();
    const vmin = Math.min(...flat);
    const vmax = Math.max(...flat);

    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Fmax heatmap" : "Fmax (MHz) — architecture × bit width",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      grid: narrow
        ? {
            left: "12%",
            right: "18%",
            top: "22%",
            bottom: "28%",
            containLabel: true,
            ...echartsGridBorder(palette),
          }
        : {
            left: "10%",
            right: "22%",
            top: "18%",
            bottom: "18%",
            containLabel: true,
            ...echartsGridBorder(palette),
          },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-heatmap", {
        dataZoom: { xAxisIndex: [0], yAxisIndex: [0] },
      }),
      tooltip: {
        position: "top",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
        formatter: (params: unknown) => {
          const p = params as { value?: [number, number, number]; data?: [number, number, number] };
          const v = p.value ?? p.data;
          if (!v) return "";
          const [xi, yi, val] = v;
          const bw = colLabels[xi];
          const arch = rowLabels[yi];
          return `${arch}<br/>${bw} b · Fmax ${val} MHz`;
        },
      },
      xAxis: {
        type: "category",
        data: colLabels,
        name: "Bit width",
        nameLocation: "middle",
        nameGap: narrow ? 24 : 28,
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLabel: echartsTextStyle(palette.axisValueLabelRgb),
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitArea: { show: true },
        splitLine: {
          show: true,
          lineStyle: {
            color: palette.axisGridGreyRgb,
            width: CHART_LINE_WIDTH,
          },
        },
      },
      yAxis: {
        type: "category",
        data: rowLabels,
        name: "Architecture",
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLabel: echartsTextStyle(palette.axisValueLabelRgb),
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitArea: { show: true },
        splitLine: {
          show: true,
          lineStyle: {
            color: palette.axisGridBlackRgb,
            width: CHART_LINE_WIDTH,
          },
        },
      },
      visualMap: {
        min: vmin,
        max: vmax,
        calculable: true,
        orient: "vertical",
        right: narrow ? 2 : 8,
        top: "middle",
        itemHeight: narrow ? 120 : 160,
        textStyle: echartsTextStyle(palette.rgbAxisTick),
        inRange: {
          color: ["#313695", "#4575b4", "#abd9e9", "#fee090", "#d73027", "#a50026"],
        },
      },
      series: [
        {
          type: "heatmap",
          data: cells,
          label: {
            show: true,
            ...echartsTextStyle(palette.rgbAxisTitle),
            formatter: (p) => {
              const raw = (p as { value?: unknown; data?: unknown }).value ?? (p as { data?: unknown }).data;
              const triple = Array.isArray(raw) ? (raw as [number, number, number]) : undefined;
              return triple?.[2] != null ? String(triple[2]) : "";
            },
          },
          emphasis: {
            itemStyle: { shadowBlur: 12, shadowColor: "rgba(0,0,0,0.35)" },
          },
        },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: 0, yAxisIndex: 0, filterMode: "none" },
        {
          type: "slider",
          xAxisIndex: 0,
          filterMode: "none",
          height: narrow ? 22 : 18,
          bottom: narrow ? 4 : 8,
          textStyle: echartsTextStyle(palette.rgbAxisTick),
        },
      ],
    };
  }, [narrow, theme]);

  const pieOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const rows64 = rowsByBitWidthOrdered(64);
    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Power share @ 64b" : "Power share at 64-bit width (donut)",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-pie-64"),
      tooltip: {
        trigger: "item",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
        formatter: "{b}<br/>{c} mW ({d}%)",
      },
      legend: {
        bottom: 4,
        type: "scroll",
        textStyle: echartsTextStyle(palette.rgbAxisTick),
      },
      series: [
        {
          name: "Power",
          type: "pie",
          radius: narrow ? ["36%", "58%"] : ["40%", "66%"],
          center: ["50%", "46%"],
          data: rows64.map((r) => ({
            name: formatArchLabel(r.architecture),
            value: r.powerMw,
            itemStyle: { color: architectureColor(r.architecture) },
          })),
          label: echartsTextStyle(palette.rgbAxisTitle),
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowOffsetX: 0,
              shadowColor: "rgba(0,0,0,0.35)",
            },
          },
        },
      ],
    };
  }, [narrow, theme]);

  const sunburstOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const tree = ppaHierarchyTree("areaUm2");
    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Sunburst (area)" : "Hierarchy: die area (µm²)",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-sunburst"),
      series: [
        {
          type: "sunburst",
          data: [tree],
          radius: [0, "92%"],
          label: echartsTextStyle(palette.rgbAxisTitle),
          itemStyle: {
            borderRadius: 6,
            borderWidth: CHART_LINE_WIDTH,
            borderColor: palette.plotBg,
          },
          emphasis: { focus: "ancestor" },
        },
      ],
    };
  }, [narrow, theme]);

  const echartsTreemapOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const tree = ppaHierarchyTree("powerMw");
    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Treemap (power)" : "Treemap: power (mW) by arch × width",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-treemap"),
      series: [
        {
          type: "treemap",
          roam: true,
          breadcrumb: { itemStyle: { color: palette.rgbAxisTick } },
          label: { show: true, ...echartsTextStyle(palette.rgbAxisTitle) },
          upperLabel: { show: true, ...echartsTextStyle(palette.rgbAxisTick) },
          itemStyle: {
            borderColor: palette.axisBorderRgb,
            borderWidth: CHART_LINE_WIDTH,
            gapWidth: 2,
          },
          data: [tree],
        },
      ],
    };
  }, [narrow, theme]);

  const radarOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const { indicators, series: radarSeries } = radarMetrics64Normalized();
    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Radar @ 64b" : "Multi-metric profile @ 64b (normalized %)",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-radar"),
      legend: {
        bottom: 0,
        type: "scroll",
        textStyle: echartsTextStyle(palette.rgbAxisTick),
      },
      radar: {
        indicator: indicators,
        radius: narrow ? "58%" : "62%",
        center: ["50%", "46%"],
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitLine: {
          lineStyle: { color: palette.axisGridGreyRgb, width: CHART_LINE_WIDTH },
        },
        splitArea: { show: true },
        axisName: echartsTextStyle(palette.axisValueLabelRgb),
      },
      series: [
        {
          type: "radar",
          data: radarSeries.map((s) => ({
            name: s.name,
            value: s.value,
            areaStyle: { opacity: 0.15, color: s.color },
            lineStyle: { width: CHART_LINE_WIDTH, color: s.color },
            itemStyle: { color: s.color },
          })),
        },
      ],
    };
  }, [narrow, theme]);

  const funnelOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const steps = funnelStepsByFmax();
    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Funnel (Fmax)" : "Designs ranked by Fmax (MHz)",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-funnel"),
      tooltip: {
        trigger: "item",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
        formatter: "{b}<br/>{c} MHz",
      },
      series: [
        {
          type: "funnel",
          sort: "descending",
          gap: 2,
          minSize: "12%",
          maxSize: "88%",
          label: echartsTextStyle(palette.rgbAxisTitle),
          data: steps.map((s) => ({
            name: s.name,
            value: s.value,
            itemStyle: { color: architectureColor(s.architecture) },
          })),
        },
      ],
    };
  }, [narrow, theme]);

  const boxplotOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const { categories, stats } = syntheticPowerBoxByArch64();
    return {
      backgroundColor: "transparent",
      textStyle: echartsTextStyle(palette.rgbAxisTitle),
      title: {
        text: narrow ? "Power box @ 64b" : "Synthetic power bands @ 64b (boxplot)",
        left: "center",
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      grid: narrow
        ? {
            left: "14%",
            right: "10%",
            top: "22%",
            bottom: "32%",
            containLabel: true,
            ...echartsGridBorder(palette),
          }
        : {
            left: "12%",
            right: "8%",
            top: "18%",
            bottom: "22%",
            containLabel: true,
            ...echartsGridBorder(palette),
          },
      toolbox: echartsToolbox(palette, theme, narrow, "echarts-boxplot", {
        dataZoom: { xAxisIndex: [0], yAxisIndex: false },
      }),
      tooltip: {
        trigger: "item",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: echartsTextStyle(palette.rgbAxisTitle),
      },
      xAxis: {
        type: "category",
        data: categories,
        boundaryGap: true,
        name: "Architecture",
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLabel: echartsTextStyle(palette.axisValueLabelRgb),
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: palette.axisGridGreyRgb,
            width: CHART_LINE_WIDTH,
            type: "dashed",
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Power (mW)",
        nameTextStyle: echartsTextStyle(palette.rgbAxisTitle),
        axisLabel: echartsTextStyle(palette.axisValueLabelRgb),
        axisLine: {
          lineStyle: { color: palette.axisBorderRgb, width: CHART_LINE_WIDTH },
        },
        splitLine: {
          lineStyle: {
            color: palette.axisGridBlackRgb,
            width: CHART_LINE_WIDTH,
            type: "dashed",
          },
        },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        {
          type: "slider",
          xAxisIndex: 0,
          filterMode: "none",
          height: narrow ? 24 : 18,
          bottom: narrow ? 6 : 10,
          textStyle: echartsTextStyle(palette.rgbAxisTick),
        },
      ],
      series: [
        {
          type: "boxplot",
          data: stats,
          itemStyle: {
            color: "rgb(139, 69, 19)",
            borderColor: palette.rgbAxisTick,
            borderWidth: CHART_LINE_WIDTH,
          },
          emphasis: {
            itemStyle: {
              borderColor: palette.rgbAxisTitle,
              shadowBlur: 8,
            },
          },
        },
      ],
    };
  }, [narrow, theme, paretoXMetric, paretoYMetric]);

  return (
    <div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Choose horizontal and vertical metrics below. Toolbox: rectangle <strong>dataZoom</strong>,{" "}
          <strong>reset</strong>, PNG. Inside zoom + bottom slider (x). Legend is hidden so it does
          not cover the axis title — use the hover card for architecture and metrics.
        </p>
        <div className="axis-pickers">
          <label className="axis-picker">
            Horizontal
            <select
              value={paretoXMetric}
              aria-label="Pareto chart horizontal axis"
              onChange={(e) => onParetoXMetricChange(e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Vertical
            <select
              value={paretoYMetric}
              aria-label="Pareto chart vertical axis"
              onChange={(e) => onParetoYMetricChange(e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.filter((m) => m !== paretoXMetric).map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="plot-host">
          <ReactECharts
            key={`pareto-${narrow ? "n" : "w"}-${paretoXMetric}-${paretoYMetric}`}
            option={paretoOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Dual-axis line + slider</h2>
        <p className="hint">
          Same scaling series as Plotly. Toolbox adds x-only rectangle zoom + reset; bottom
          slider for phones.
        </p>
        <div className="plot-host">
          <ReactECharts
            key={narrow ? "line-narrow" : "line-wide"}
            option={lineOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Grouped bar</h2>
        <p className="hint">
          64-bit power by architecture. <strong>magicType</strong> toggles line/bar;
          slider + inside zoom on categories.
        </p>
        <div className="plot-host">
          <ReactECharts
            key={narrow ? "bar-narrow" : "bar-wide"}
            option={barOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Heatmap</h2>
        <p className="hint">
          Fmax grid with <strong>visualMap</strong>, cell labels, and 2D zoom (inside +
          slider).
        </p>
        <div className="plot-host">
          <ReactECharts
            key={narrow ? "heat-narrow" : "heat-wide"}
            option={heatmapOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Donut (pie)</h2>
        <p className="hint">Power mix at 64b — pairs with the bar chart.</p>
        <div className="plot-host plot-host--short">
          <ReactECharts
            key={narrow ? "pie-narrow" : "pie-wide"}
            option={pieOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Sunburst</h2>
        <p className="hint">
          Radial hierarchy for die <strong>area</strong> (µm²): architecture → bit width.
        </p>
        <div className="plot-host plot-host--short">
          <ReactECharts
            key={narrow ? "sun-narrow" : "sun-wide"}
            option={sunburstOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Treemap</h2>
        <p className="hint">
          Rectangular layout for <strong>power</strong> (mW); pinch/drag <code>roam</code> on
          touch.
        </p>
        <div className="plot-host plot-host--short">
          <ReactECharts
            key={narrow ? "tree-narrow" : "tree-wide"}
            option={echartsTreemapOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Radar</h2>
        <p className="hint">
          Normalized Fmax / power / area @ 64b — compare architectures on one web.
        </p>
        <div className="plot-host plot-host--short">
          <ReactECharts
            key={narrow ? "radar-narrow" : "radar-wide"}
            option={radarOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Funnel</h2>
        <p className="hint">Throughput-style ordering by peak Fmax (MHz) across all eight designs.</p>
        <div className="plot-host plot-host--short">
          <ReactECharts
            key={narrow ? "fun-narrow" : "fun-wide"}
            option={funnelOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Boxplot</h2>
        <p className="hint">
          Illustrative power quartiles @ 64b (synthetic spread — not silicon measurements).
        </p>
        <div className="plot-host">
          <ReactECharts
            key={narrow ? "box-narrow" : "box-wide"}
            option={boxplotOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <p className="note">
        ECharts: lighter than full Plotly for many dashboards; this page adds hierarchy (
        <code>sunburst</code>, <code>treemap</code>), <code>radar</code>, <code>funnel</code>,
        and <code>boxplot</code> alongside the earlier Cartesian charts. 3D WebGL in ECharts
        needs <code>echarts-gl</code> — here, 3D is shown on the Plotly route only.
      </p>
    </div>
  );
}
