'use client';

import { useAuth as useAuthContext } from '@/context/auth-provider';

export function useAuth() {
  return useAuthContext();
}

export default useAuth;
