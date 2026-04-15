import { useEffect, useState } from 'react';

export function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);

    window.addEventListener('popstate', syncPath);

    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  return pathname;
}
