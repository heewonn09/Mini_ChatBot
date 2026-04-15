/**
 * Improve this Card component:
 *
 * - Make it reusable for dashboard stats
 * - Add hover effect
 * - Add optional subtitle
 * - Use Tailwind styling (dark SaaS style)
 * - Support routing with react-router-dom
 */
import { useNavigate } from 'react-router-dom';

export default function Card({ 
  title, 
  value, 
  subtitle, 
  onClick,
  navigateTo,
  className = '' 
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (navigateTo) {
      navigate(navigateTo);
    }
  };

  const baseStyles = "bg-zinc-900 p-6 rounded-xl border border-zinc-800 transition";
  const interactiveStyles = (onClick || navigateTo) 
    ? "hover:border-zinc-600 hover:bg-zinc-800 cursor-pointer hover:shadow-lg hover:shadow-zinc-900/50" 
    : "hover:border-zinc-700";

  return (
    <div 
      className={`${baseStyles} ${interactiveStyles} ${className}`}
      onClick={handleClick}
      role={onClick || navigateTo ? "button" : undefined}
      tabIndex={onClick || navigateTo ? 0 : undefined}
      onKeyDown={(e) => {
        if ((onClick || navigateTo) && (e.key === 'Enter' || e.key === ' ')) {
          handleClick();
        }
      }}
    >
      <p className="text-sm text-zinc-400 mb-2">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-2">{subtitle}</p>}
    </div>
  );
}
