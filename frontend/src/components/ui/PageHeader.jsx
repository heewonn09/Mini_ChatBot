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
  const titleClassName = {
    hero: "text-4xl font-bold tracking-tight text-zinc-50 sm:text-[3.5rem]",
    standard: "text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl",
    icon: "text-4xl font-bold tracking-tight text-zinc-50 sm:text-[3.25rem]",
    profile: "text-4xl font-bold tracking-tight text-zinc-50 sm:text-[3rem]",
  }[variant];
  const descriptionClassName = variant === "hero" || variant === "icon"
    ? "max-w-3xl text-lg text-zinc-400"
    : "max-w-3xl text-base text-zinc-400";
  const visualClassName = variant === "profile"
    ? "flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white"
    : "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white";
  const Icon = ProfileIcon || BadgeIcon;

  return (
    <header className={`space-y-4 ${className}`.trim()}>
      {hasVisual ? (
        <div className="flex items-center gap-5">
          <div className={visualClassName}>
            <Icon size={variant === "profile" ? 34 : 22} strokeWidth={2.1} />
          </div>
          <div className="space-y-1.5">
            <h1 className={titleClassName}>{title}</h1>
            {meta ? <p className="text-[1.05rem] text-zinc-400">{meta}</p> : null}
            {description ? <p className={descriptionClassName}>{description}</p> : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h1 className={titleClassName}>{title}</h1>
          {description ? <p className={descriptionClassName}>{description}</p> : null}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
