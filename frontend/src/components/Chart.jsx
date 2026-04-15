import {
  LineChart,
  Line,
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
    <div className="bg-zinc-900 p-4 rounded-xl">
      <h2 className="text-white mb-4">Daily Activity Timeline</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="time" stroke="#aaa" />
          <YAxis stroke="#aaa" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#ff4d6d"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}