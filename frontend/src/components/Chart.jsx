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
    <div className="rounded-xl border border-zinc-800 bg-[#111118] px-3 py-2 shadow-2xl shadow-black/25">
      {label ? <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const config = series.find((item) => item.key === entry.dataKey) ?? {};

          return (
            <div
              key={`${entry.dataKey ?? entry.name ?? "series"}-${entry.value}`}
              className="flex items-center gap-2 text-sm text-zinc-200"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${config.dotClassName ?? "bg-violet-400"}`} />
              <span className="text-zinc-300">{config.label ?? entry.name}</span>
              <span className="font-semibold text-zinc-50">{entry.value}</span>
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
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-[#0d0d12] text-sm text-zinc-500">
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
                    <stop offset="5%" stopColor={item.stroke} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={item.stroke} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid stroke="#27272f" strokeDasharray="3 3" />
            <XAxis dataKey={categoryKey} stroke="#71717a" tickLine={false} axisLine={{ stroke: "#3f3f46" }} />
            <YAxis stroke="#71717a" tickLine={false} axisLine={{ stroke: "#3f3f46" }} />
            <Tooltip content={(props) => <ChartTooltip {...props} series={series} />} />
            {series.map((item) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stroke={item.stroke}
                strokeWidth={2}
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
            <CartesianGrid stroke="#27272f" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#71717a" tickLine={false} axisLine={{ stroke: "#3f3f46" }} />
            <YAxis
              dataKey={categoryKey}
              type="category"
              stroke="#71717a"
              width={96}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} series={series} />} />
            <Bar dataKey={bar.key} fill={bar.stroke} radius={[0, 10, 10, 0]} />
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
                  <Cell key={item[categoryKey]} fill={item.color} stroke="#111118" strokeWidth={3} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {legend.length ? (
            <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-base text-zinc-400">
                  <span className={`h-3.5 w-3.5 rounded-full ${item.dotClassName}`} />
                  <span>{item.label}</span>
                  <span className="font-semibold text-zinc-50">{item.value}</span>
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
            <PolarGrid stroke="#4a4a55" />
            <PolarAngleAxis dataKey={categoryKey} stroke="#787885" tickLine={false} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666676" tickCount={5} />
            <Tooltip content={(props) => <ChartTooltip {...props} series={series} />} />
            <Radar dataKey={radar.key} stroke={radar.stroke} fill={radar.stroke} fillOpacity={0.42} />
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
      titleClassName="text-[1.15rem] font-bold leading-none text-zinc-50 sm:text-[1.2rem]"
      subtitleClassName="pt-1 text-[0.98rem] text-zinc-500"
    >
      {renderChart()}
    </Card>
  );
}
