import { Link } from "react-router-dom";

// 기본 일러스트: 별빛 아래 잠든 캐릭터
function DefaultIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* 달 */}
      <circle cx="95" cy="18" r="12" fill="#f8ecd7" />
      <circle cx="101" cy="14" r="9" fill="var(--surface, #f5f0e8)" />
      {/* 별들 */}
      <circle cx="20" cy="12" r="2" fill="#d9a85a" opacity="0.7" />
      <circle cx="40" cy="6" r="1.5" fill="#d9a85a" opacity="0.5" />
      <circle cx="68" cy="10" r="1.5" fill="#d9a85a" opacity="0.6" />
      <circle cx="10" cy="30" r="1" fill="#d9a85a" opacity="0.4" />
      {/* 구름 */}
      <ellipse cx="30" cy="52" rx="22" ry="10" fill="#e8f4f2" />
      <ellipse cx="18" cy="55" rx="12" ry="8" fill="#e8f4f2" />
      <ellipse cx="44" cy="56" rx="14" ry="8" fill="#e8f4f2" />
      {/* 캐릭터 몸 */}
      <ellipse cx="60" cy="70" rx="18" ry="13" fill="#def2ee" />
      {/* 캐릭터 머리 */}
      <circle cx="60" cy="52" r="14" fill="#fde8d8" />
      {/* 눈 (감은 눈) */}
      <path d="M54 51 Q56 49 58 51" stroke="#c4796a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M62 51 Q64 49 66 51" stroke="#c4796a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* ZZZ */}
      <text x="78" y="42" fontSize="8" fontWeight="bold" fill="#0f766e" opacity="0.5">z</text>
      <text x="84" y="34" fontSize="10" fontWeight="bold" fill="#0f766e" opacity="0.6">z</text>
      <text x="91" y="25" fontSize="12" fontWeight="bold" fill="#0f766e" opacity="0.7">z</text>
      {/* 하단 선 */}
      <line x1="10" y1="90" x2="110" y2="90" stroke="var(--border, rgba(24,50,53,0.1))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ icon: Icon, title, description, illustration, ctaLabel, ctaHref, onCta, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      {/* 일러스트 또는 아이콘 */}
      {illustration ?? (
        Icon ? (
          <div className="w-16 h-16 rounded-full bg-[color:var(--surface-soft)] flex items-center justify-center">
            <Icon size={28} className="text-[color:var(--ink-soft)]" />
          </div>
        ) : (
          <DefaultIllustration />
        )
      )}

      <div className="space-y-1 max-w-xs">
        <p className="font-bold text-[color:var(--ink)] text-base">{title}</p>
        {description && (
          <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">{description}</p>
        )}
      </div>

      {/* CTA 버튼 */}
      {ctaHref && ctaLabel && (
        <Link
          to={ctaHref}
          className="app-primary-button mt-1 px-5 py-2.5 text-sm font-semibold"
        >
          {ctaLabel} →
        </Link>
      )}
      {onCta && ctaLabel && !ctaHref && (
        <button
          type="button"
          onClick={onCta}
          className="app-primary-button mt-1 px-5 py-2.5 text-sm font-semibold"
        >
          {ctaLabel} →
        </button>
      )}

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
