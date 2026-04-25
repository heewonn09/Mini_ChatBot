import { AlertCircle, Clock3, Lightbulb, Target } from "lucide-react";
import Card from "./Card";

const toneMap = {
  warning: {
    tile: "bg-amber-500/10 text-amber-400",
    Icon: AlertCircle,
  },
  success: {
    tile: "bg-emerald-500/10 text-emerald-400",
    Icon: Lightbulb,
  },
  info: {
    tile: "bg-blue-500/10 text-blue-400",
    Icon: Target,
  },
  accent: {
    tile: "bg-orange-500/10 text-orange-400",
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
  const { tile, Icon: FallbackIcon } = toneMap[tone] ?? toneMap.info;
  const Icon = IconProp ?? FallbackIcon;

  return (
    <Card className={`p-5 ${className}`.trim()}>
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tile}`}>
          <Icon size={18} strokeWidth={2.1} />
        </div>
        <div className="space-y-2">
          <h3 className="text-[1.05rem] font-bold leading-7 text-zinc-50 sm:text-[1.15rem]">{title}</h3>
          <p className="text-[0.98rem] leading-8 text-zinc-400">{description}</p>
        </div>
      </div>
    </Card>
  );
}
