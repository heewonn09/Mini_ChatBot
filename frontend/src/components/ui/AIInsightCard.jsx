export default function AIInsightCard({ title, description, type }) {
  const colorMap = {
    warning: "bg-yellow-500/20 text-yellow-400",
    success: "bg-green-500/20 text-green-400",
    info: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start gap-3">
        
        {/* 아이콘 */}
        <div
          className={`w-8 h-8 flex items-center justify-center rounded-md ${colorMap[type]}`}
        >
          ⚡
        </div>

        {/* 텍스트 */}
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-zinc-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}