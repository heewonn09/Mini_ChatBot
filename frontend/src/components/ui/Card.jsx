export default function Card({ title, value, subtitle, icon, color, trend }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 hover:bg-zinc-900 transition">
      
      {/* 상단 */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>

        {trend && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            trend === "up"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}>
            {trend === "up" ? "↑" : "↓"}
          </span>
        )}
      </div>

      {/* 텍스트 */}
      <p className="text-xs text-zinc-400">{title}</p>
      <h2 className="text-xl font-semibold mt-1">{value}</h2>
      {subtitle && (
        <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}