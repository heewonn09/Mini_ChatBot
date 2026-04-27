import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "./ui/Card";

function ChartTooltip({ active, label, payload, series }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-[1.35rem] border border-[rgba(24,50,53,0.12)] bg-[rgba(255,250,244,0.96)] px-3 py-2 shadow-[var(--shadow-sm)] backdrop-blur-xl">
      {label ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const config = series.find((item) => item.key === entry.dataKey) ?? {};

          return (
            <div
              key={`${entry.dataKey ?? entry.name ?? "series"}-${entry.value}`}
              className="flex items-center gap-2 text-sm text-[color:var(--ink)]"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${config.dotClassName ?? "bg-[#0f766e]"}`} />
              <span className="text-[color:var(--ink-soft)]">{config.label ?? entry.name}</span>
              <span className="font-semibold text-[color:var(--ink)]">{entry.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildGradientId(title, key) {
  return `${(title || "chart").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${key}`;
}

export default function Chart({
  variant = "area-compare",
  title,
  description,
  data = [],
  series = [],
  legend = [],
  height = 280,
  className = "",
  categoryKey = "label",
}) {
  const emptyState = (
    <div className="flex items-center justify-center rounded-[1.6rem] border border-dashed border-[rgba(24,50,53,0.16)] bg-[rgba(255,255,255,0.46)] text-sm text-[color:var(--ink-soft)]">
      <div className="py-16 text-center">No data available yet.</div>
    </div>
  );

  const renderChart = () => {
    if (!data.length) {
      return emptyState;
    }

    if (variant === "area-compare") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              {series.map((item) => {
                const gradientId = buildGradientId(title, item.key);
                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={item.stroke} stopOpacity={0.24} />
                    <stop offset="95%" stopColor={item.stroke} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid stroke="#e8ddd1" strokeDasharray="4 4" />
            <XAxis dataKey={categoryKey} stroke="#869396" tickLine={false} axisLine={{ stroke: "#d9d1c7" }} />
            <YAxis stroke="#869396" tickLine={false} axisLine={{ stroke: "#d9d1c7" }} />
            <Tooltip content={(props) => <ChartTooltip {...props} series={series} />} />
            {series.map((item) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stroke={item.stroke}
                strokeWidth={2.4}
                fill={`url(#${buildGradientId(title, item.key)})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (variant === "bar-horizontal") {
      const bar = series[0];

      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" barCategoryGap={14}>
            <CartesianGrid stroke="#e8ddd1" strokeDasharray="4 4" />
            <XAxis type="number" stroke="#869396" tickLine={false} axisLine={{ stroke: "#d9d1c7" }} />
            <YAxis
              dataKey={categoryKey}
              type="category"
              stroke="#869396"
              width={110}
              tickLine={false}
              axisLine={{ stroke: "#d9d1c7" }}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} series={series} />} />
            <Bar dataKey={bar.key} fill={bar.stroke} radius={[0, 12, 12, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (variant === "donut") {
      return (
        <div className="space-y-6">
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Tooltip content={(props) => <ChartTooltip {...props} series={series} />} />
              <Pie
                data={data}
                dataKey={series[0]?.key ?? "value"}
                nameKey={categoryKey}
                innerRadius={68}
                outerRadius={102}
                paddingAngle={3}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((item) => (
                  <Cell key={item[categoryKey]} fill={item.color} stroke="#fffaf4" strokeWidth={3} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {legend.length ? (
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[0.98rem] text-[color:var(--ink-soft)]">
                  <span className={`h-3.5 w-3.5 rounded-full ${item.dotClassName}`} />
                  <span>{item.label}</span>
                  <span className="font-semibold text-[color:var(--ink)]">{item.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (variant === "radar") {
      const radar = series[0];

      return (
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={data}>
            <PolarGrid stroke="#ddd1c5" />
            <PolarAngleAxis dataKey={categoryKey} stroke="#869396" tickLine={false} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#b4bfc1" tickCount={5} />
            <Tooltip content={(props) => <ChartTooltip {...props} series={series} />} />
            <Radar dataKey={radar.key} stroke={radar.stroke} fill={radar.stroke} fillOpacity={0.28} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <Card
      title={title}
      subtitle={description}
      className={`p-6 ${className}`.trim()}
      titleClassName="app-heading text-[1.45rem] leading-tight text-[color:var(--ink)]"
      subtitleClassName="pt-1 text-[0.98rem] text-[color:var(--ink-soft)]"
    >
      {renderChart()}
    </Card>
  );
}
