function PageHeader({
  title,
  description,
  variant = "standard",
  badgeIcon: BadgeIcon,
  profileIcon: ProfileIcon,
  meta,
  className = "",
}) {
  const hasVisual = Boolean(BadgeIcon || ProfileIcon);
  const eyebrowText = {
    hero: "Weekly snapshot",
    standard: "Capture a moment",
    icon: "Insight studio",
    profile: "Personal rhythm",
  }[variant];
  const titleClassName = {
    hero: "app-heading text-5xl leading-[0.95] text-[color:var(--ink)] sm:text-[4.5rem]",
    standard: "app-heading text-4xl leading-tight text-[color:var(--ink)] sm:text-[3.35rem]",
    icon: "app-heading text-4xl leading-tight text-[color:var(--ink)] sm:text-[3.25rem]",
    profile: "app-heading text-4xl leading-tight text-[color:var(--ink)] sm:text-[3.15rem]",
  }[variant];
  const Icon = ProfileIcon || BadgeIcon;

  return (
    <header className={`space-y-4 ${className}`.trim()}>
      <div className="app-kicker">{eyebrowText}</div>
      {hasVisual ? (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 flex items-center justify-center rounded-[1.6rem] ${
                variant === "profile"
                  ? "h-16 w-16 bg-[#def2ee] text-[#0f766e]"
                  : "h-14 w-14 bg-[#f8e2d9] text-[#dd7a5f]"
              }`}
            >
              <Icon size={variant === "profile" ? 28 : 24} strokeWidth={2.1} />
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className={titleClassName}>{title}</h1>
              {description ? (
                <p className="max-w-3xl text-[1rem] leading-8 text-[color:var(--ink-soft)] sm:text-[1.05rem]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {meta ? <span className="app-chip text-sm font-semibold">{meta}</span> : null}
        </div>
      ) : (
        <div className="space-y-3">
          <h1 className={titleClassName}>{title}</h1>
          {description ? (
            <p className="max-w-3xl text-[1rem] leading-8 text-[color:var(--ink-soft)] sm:text-[1.05rem]">
              {description}
            </p>
          ) : null}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
