import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ADDER_DEMO_ROWS, architectureColor } from "../data/samplePpa";

type ScatterDatum = {
  value: [number, number];
  bitWidth: number;
  areaUm2: number;
};

export function EChartsPage(): JSX.Element {
  const paretoOption = useMemo((): EChartsOption => {
    const byArch = new Map<string, typeof ADDER_DEMO_ROWS>();
    for (const row of ADDER_DEMO_ROWS) {
      const list = byArch.get(row.architecture) ?? [];
      list.push(row);
      byArch.set(row.architecture, list);
    }

    const series = [...byArch.entries()].map(([arch, rows]) => ({
      name: arch,
      type: "scatter" as const,
      symbolSize: (params: { data: ScatterDatum }) => {
        const bw = params.data.bitWidth;
        return 10 + (bw / 64) * 14;
      },
      itemStyle: { color: architectureColor(arch) },
      emphasis: { focus: "series" as const },
      data: rows.map((r) => ({
        value: [r.fmaxMhz, r.powerMw] as [number, number],
        bitWidth: r.bitWidth,
        areaUm2: r.areaUm2,
      })),
    }));

    return {
      backgroundColor: "transparent",
      textStyle: { color: "#e7ecf3" },
      title: {
        text: "Pareto-style: Fmax vs power (demo data)",
        left: "center",
        textStyle: { fontSize: 14, color: "#e7ecf3" },
      },
      grid: { left: "12%", right: "6%", top: "18%", bottom: "22%", containLabel: true },
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const p = params as {
            seriesName?: string;
            data?: ScatterDatum;
          };
          const d = p.data;
          if (!d?.value) return "";
          const [fmax, pwr] = d.value;
          return `${p.seriesName}<br/>Fmax: ${fmax} MHz<br/>Power: ${pwr} mW<br/>Width: ${d.bitWidth} b<br/>Area: ${d.areaUm2} µm²`;
        },
      },
      legend: {
        bottom: 0,
        type: "scroll",
        textStyle: { color: "#8b9bb4" },
      },
      xAxis: {
        name: "Fmax (MHz)",
        nameLocation: "middle",
        nameGap: 28,
        axisLine: { lineStyle: { color: "#2d3a4d" } },
        splitLine: { lineStyle: { color: "#2d3a4d" } },
      },
      yAxis: {
        name: "Power (mW)",
        nameLocation: "middle",
        nameGap: 40,
        axisLine: { lineStyle: { color: "#2d3a4d" } },
        splitLine: { lineStyle: { color: "#2d3a4d" } },
      },
      series,
      media: [
        {
          query: { maxWidth: 480 },
          option: {
            grid: { bottom: "32%", left: "14%" },
            legend: { bottom: "6%", orient: "horizontal" },
          },
        },
      ],
    };
  }, []);

  const lineOption = useMemo((): EChartsOption => {
    const ks = ADDER_DEMO_ROWS.filter((r) => r.architecture === "kogge_stone").sort(
      (a, b) => a.bitWidth - b.bitWidth,
    );
    const bw = ks.map((r) => r.bitWidth);

    return {
      backgroundColor: "transparent",
      textStyle: { color: "#e7ecf3" },
      title: {
        text: "Scaling: Kogge-Stone vs bit width",
        left: "center",
        textStyle: { fontSize: 14, color: "#e7ecf3" },
      },
      grid: { left: "12%", right: "14%", top: "18%", bottom: "24%", containLabel: true },
      tooltip: { trigger: "axis" },
      legend: {
        bottom: 0,
        data: ["Fmax (MHz)", "Area (µm²)"],
        textStyle: { color: "#8b9bb4" },
      },
      xAxis: {
        type: "category",
        data: bw,
        name: "Bit width",
        axisLine: { lineStyle: { color: "#2d3a4d" } },
      },
      yAxis: [
        {
          type: "value",
          name: "Fmax (MHz)",
          position: "left",
          axisLine: { show: true, lineStyle: { color: architectureColor("kogge_stone") } },
          splitLine: { lineStyle: { color: "#2d3a4d" } },
        },
        {
          type: "value",
          name: "Area (µm²)",
          position: "right",
          axisLine: { show: true, lineStyle: { color: "#ff9f4a" } },
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
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 2, color: architectureColor("kogge_stone") },
        },
        {
          name: "Area (µm²)",
          type: "line",
          yAxisIndex: 1,
          data: ks.map((r) => r.areaUm2),
          smooth: true,
          symbol: "diamond",
          symbolSize: 8,
          lineStyle: { width: 2, type: "dashed", color: "#ff9f4a" },
        },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        {
          type: "slider",
          xAxisIndex: 0,
          height: 22,
          bottom: 36,
          textStyle: { color: "#8b9bb4" },
        },
      ],
      media: [
        {
          query: { maxWidth: 480 },
          option: {
            grid: { bottom: "38%" },
            dataZoom: [
              { type: "inside", xAxisIndex: 0 },
              { type: "slider", xAxisIndex: 0, height: 20, bottom: 52 },
            ],
          },
        },
      ],
    };
  }, []);

  return (
    <div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Drag inside chart to zoom; legend scroll on small screens. Pinch works with
          inside zoom on many mobile browsers.
        </p>
        <div className="plot-host">
          <ReactECharts
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
          Bottom <strong>dataZoom</strong> slider helps fat-finger navigation on phones.
        </p>
        <div className="plot-host">
          <ReactECharts
            option={lineOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <p className="note">
        ECharts: smaller initial payload than full Plotly, strong performance on mobile
        canvas; <code>media</code> + <code>dataZoom</code> are ideal for responsive
        dashboards.
      </p>
    </div>
  );
}
