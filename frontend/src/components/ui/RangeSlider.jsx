function RangeSlider({
  id,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  label,
  showValue = true,
  lowLabel,
  highLabel,
  midLabel,
}) {
  return (
    <div className="space-y-3">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className="block text-[1.02rem] font-bold text-[color:var(--ink)]">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-bold text-[color:var(--ink)]">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-[#0f766e]"
      />
      {(lowLabel || midLabel || highLabel) && (
        <div className="flex justify-between text-xs text-[color:var(--ink-soft)]">
          <span>{lowLabel}</span>
          {midLabel && <span>{midLabel}</span>}
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

export default RangeSlider;
