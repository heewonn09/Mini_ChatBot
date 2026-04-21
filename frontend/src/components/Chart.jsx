import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "6am", value: 20 },
  { time: "9am", value: 80 },
  { time: "12pm", value: 60 },
  { time: "3pm", value: 40 },
  { time: "6pm", value: 30 },
  { time: "9pm", value: 20 },
  { time: "12am", value: 5 },
];

export default function Chart() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h2 className="text-white mb-4 text-sm">Daily Activity Timeline</h2>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          {/* 그라데이션 정의 */}
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis dataKey="time" stroke="#666" />
          <YAxis stroke="#666" />
          
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "none",
              borderRadius: "8px",
            }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="#ff4d6d"
            strokeWidth={2}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}