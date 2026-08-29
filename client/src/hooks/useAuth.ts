import { useState, useEffect } from 'react';
import { api } from '../api';
import type { UserInfo } from '../api';

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    api.me()
      .then(data => setState({ user: data.user, loading: false }))
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return state;
}
