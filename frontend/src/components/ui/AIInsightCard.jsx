import { AlertCircle, Clock3, Lightbulb, Target } from "lucide-react";
import Card from "./Card";

const toneMap = {
  warning: {
    tile: "bg-[#f8e2d9] text-[#dd7a5f]",
    border: "border-[#f1cabb]",
    Icon: AlertCircle,
  },
  success: {
    tile: "bg-[#def2ee] text-[#0f766e]",
    border: "border-[#cae8e2]",
    Icon: Lightbulb,
  },
  info: {
    tile: "bg-[#f8ecd7] text-[#b67f20]",
    border: "border-[#efd8ad]",
    Icon: Target,
  },
  accent: {
    tile: "bg-[#e7eee3] text-[#5d7f65]",
    border: "border-[#d7e0d3]",
    Icon: Clock3,
  },
};

export default function AIInsightCard({
  title,
  description,
  tone = "info",
  icon: IconProp,
  className = "",
}) {
  const { tile, border, Icon: FallbackIcon } = toneMap[tone] ?? toneMap.info;
  const Icon = IconProp ?? FallbackIcon;

  return (
    <Card className={`app-panel-strong p-5 ${border} ${className}`.trim()}>
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.25rem] ${tile}`}>
          <Icon size={18} strokeWidth={2.1} />
        </div>
        <div className="space-y-2">
          <h3 className="app-heading text-[1.3rem] leading-7 text-[color:var(--ink)]">{title}</h3>
          <p className="text-[0.98rem] leading-7 text-[color:var(--ink-soft)]">{description}</p>
        </div>
      </div>
    </Card>
  );
}
