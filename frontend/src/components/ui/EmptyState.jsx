export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[color:var(--surface-soft)] flex items-center justify-center">
          <Icon size={28} className="text-[color:var(--ink-soft)]" />
        </div>
      )}
      <div>
        <p className="font-semibold text-[color:var(--ink)]">{title}</p>
        {description && (
          <p className="text-sm text-[color:var(--ink-soft)] mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
