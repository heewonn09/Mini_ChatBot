import { ArrowDown, ArrowUp, Minus } from "lucide-react";

const trendMap = {
  up: {
    Icon: ArrowUp,
    container: "bg-[#def2ee] text-[#0f766e]",
  },
  down: {
    Icon: ArrowDown,
    container: "bg-[#f8e2d9] text-[#dd7a5f]",
  },
  neutral: {
    Icon: Minus,
    container: "bg-[rgba(247,240,231,0.92)] text-[color:var(--ink-soft)]",
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
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <article className={`app-panel rounded-[2rem] border ${className}`.trim()}>
      {(icon || trendUi) ? (
        <div className="mb-4 flex items-start justify-between">
          {icon ? (
            <div className={`flex h-11 w-11 items-center justify-center rounded-[1.2rem] ${iconClassName}`.trim()}>
              {icon}
            </div>
          ) : (
            <span />
          )}
          {trendUi ? (
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${trendUi.container}`}>
              <trendUi.Icon size={13} />
            </span>
          ) : null}
        </div>
      ) : null}

      {(title || hasValue || subtitle) ? (
        <div className={`space-y-1.5 ${bodyClassName}`.trim()}>
          {title ? (
            <h2 className={`text-[0.98rem] font-semibold text-[color:var(--ink-soft)] ${titleClassName}`.trim()}>
              {title}
            </h2>
          ) : null}
          {hasValue ? (
            <p className={`text-[2.15rem] font-bold leading-tight text-[color:var(--ink)] ${valueClassName}`.trim()}>
              {value}
            </p>
          ) : null}
          {subtitle ? (
            <p className={`text-[0.98rem] text-[color:var(--ink-soft)] ${subtitleClassName}`.trim()}>{subtitle}</p>
          ) : null}
        </div>
      ) : null}

      {children ? <div className={title || hasValue || subtitle ? "mt-6" : ""}>{children}</div> : null}
      {footer ? <div className="mt-5">{footer}</div> : null}
    </article>
  );
}

export default Card;
