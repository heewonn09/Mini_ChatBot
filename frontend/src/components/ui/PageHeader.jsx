function PageHeader({ title, description }) {
  return (
    <header className="mb-8">
      <p className="text-xs uppercase tracking-[0.24em] text-violet-300/80">Overview</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">{description}</p>
    </header>
  );
}

export default PageHeader;
