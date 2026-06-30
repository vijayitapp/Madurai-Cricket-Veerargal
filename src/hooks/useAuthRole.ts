import { useState } from 'react';

export type AppRole = 'player' | 'scorer' | 'admin' | null;

export function useAuthRole() {
  const [role, setRole] = useState<AppRole>(() => {
    return (sessionStorage.getItem('appRole') as AppRole) || null;
  });

  const setAppRole = (newRole: AppRole) => {
    if (newRole) {
      sessionStorage.setItem('appRole', newRole);
    } else {
      sessionStorage.removeItem('appRole');
    }
    setRole(newRole);
  };

  return { role, setRole: setAppRole };
}
