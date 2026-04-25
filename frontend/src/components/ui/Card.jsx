import { ArrowDown, ArrowUp, Minus } from "lucide-react";

const trendMap = {
  up: {
    Icon: ArrowUp,
    container: "bg-emerald-500/10 text-emerald-400",
  },
  down: {
    Icon: ArrowDown,
    container: "bg-rose-500/10 text-rose-400",
  },
  neutral: {
    Icon: Minus,
    container: "bg-zinc-700/70 text-zinc-300",
  },
};

function Card({
  title,
  value,
  subtitle,
  icon,
  iconClassName = "",
  trend,
  footer,
  children,
  className = "",
  titleClassName = "",
  valueClassName = "",
  subtitleClassName = "",
  bodyClassName = "",
}) {
  const trendUi = trend ? trendMap[trend] ?? trendMap.neutral : null;

  return (
    <article
      className={`rounded-[1.65rem] border border-zinc-800/80 bg-[#101014] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${className}`.trim()}
    >
      {(icon || trendUi) ? (
        <div className="mb-4 flex items-start justify-between">
          {icon ? (
            <div className={`flex h-10 w-10 items-center justify-center rounded-[1.05rem] ${iconClassName}`.trim()}>
              {icon}
            </div>
          ) : (
            <span />
          )}
          {trendUi ? (
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${trendUi.container}`}>
              <trendUi.Icon size={12} />
            </span>
          ) : null}
        </div>
      ) : null}

      {(title || value || subtitle) ? (
        <div className={`space-y-1 ${bodyClassName}`.trim()}>
          {title ? (
            <h2 className={`text-[1.02rem] font-medium text-zinc-400 ${titleClassName}`.trim()}>{title}</h2>
          ) : null}
          {value ? (
            <p className={`text-[2.15rem] font-bold leading-tight text-zinc-50 ${valueClassName}`.trim()}>{value}</p>
          ) : null}
          {subtitle ? (
            <p className={`text-[0.98rem] text-zinc-500 ${subtitleClassName}`.trim()}>{subtitle}</p>
          ) : null}
        </div>
      ) : null}

      {children ? <div className={title || value || subtitle ? "mt-6" : ""}>{children}</div> : null}
      {footer ? <div className="mt-5">{footer}</div> : null}
    </article>
  );
}

export default Card;
