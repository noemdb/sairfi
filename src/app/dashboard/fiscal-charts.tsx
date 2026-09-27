"use client";

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import type { InpcPoint } from "@/lib/domain/dashboard";

const NAVY = "#0f2b46";
const SKY = "#0ea5e9";
const EMERALD = "#10b981";
const AMBER = "#f59e0b";

const noData = {
  text: "Sin datos aún",
  align: "center" as const,
  verticalAlign: "middle" as const,
  style: { color: "#64748b", fontSize: "13px" },
};
const fontFamily = "inherit";

function useApexChart(ref: React.RefObject<HTMLDivElement | null>, options: ApexOptions, depsKey: string) {
  useEffect(() => {
    let chart: ApexCharts | null = null;
    let cancelled = false;
    (async () => {
      const { default: ApexCharts } = await import("apexcharts");
      if (cancelled || !ref.current) return;
      chart = new ApexCharts(ref.current, options);
      await chart.render();
    })();
    return () => {
      cancelled = true;
      chart?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);
}

/** Evolución del INPC aprobado — base del factor de actualización (INPC cierre / INPC base). */
export function InpcAreaChart({ series }: { series: InpcPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const options: ApexOptions = {
    chart: { type: "area", height: 280, toolbar: { show: false }, fontFamily, zoom: { enabled: false } },
    colors: [SKY],
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 0.4, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] },
    },
    stroke: { curve: "smooth", width: 2.5 },
    markers: { size: 0, hover: { size: 5 } },
    series: [{ name: "INPC", data: series.map((p) => p.value) }],
    xaxis: {
      categories: series.map((p) => p.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#64748b" }, rotate: -30, trim: true },
    },
    yaxis: { labels: { style: { colors: "#64748b" }, formatter: (v: number) => v.toLocaleString("es-VE") } },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 3 },
    tooltip: { theme: "light", y: { formatter: (v: number) => v.toLocaleString("es-VE", { maximumFractionDigits: 6 }) } },
    noData,
  };
  useApexChart(ref, options, JSON.stringify(series));
  return <div ref={ref} className="w-full" role="img" aria-label="Evolución del INPC aprobado" />;
}

/**
 * Partidas monetarias vs no monetarias. Solo las no monetarias se ajustan
 * (LISLR arts. 173-177); las pendientes traban el cálculo.
 */
export function MonetaryDonutChart({
  monetarias,
  noMonetarias,
  sinClasificar,
}: {
  monetarias: number;
  noMonetarias: number;
  sinClasificar: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const options: ApexOptions = {
    chart: { type: "donut", height: 280, fontFamily },
    colors: [NAVY, EMERALD, AMBER],
    series: [monetarias, noMonetarias, sinClasificar],
    labels: ["Monetarias", "No monetarias", "Sin clasificar"],
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: { show: true, label: "Partidas", fontSize: "13px", color: "#64748b" },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: { position: "bottom", markers: { shape: "circle" as const } },
    stroke: { width: 2, colors: ["#ffffff"] },
    tooltip: { theme: "light" },
    noData,
  };
  useApexChart(ref, options, JSON.stringify([monetarias, noMonetarias, sinClasificar]));
  return <div ref={ref} className="w-full" role="img" aria-label="Partidas por clasificación monetaria" />;
}
