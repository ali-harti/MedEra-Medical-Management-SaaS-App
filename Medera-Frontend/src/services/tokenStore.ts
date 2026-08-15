// Access token in memory only — never persisted
let _accessToken: string | null = null;

export const getAccessToken = (): string | null => _accessToken;
export const setAccessToken = (token: string): void => { _accessToken = token; };

export const getRefreshToken = (): string | null =>
  localStorage.getItem('medera_refresh');
export const setRefreshToken = (token: string): void =>
  localStorage.setItem('medera_refresh', token);

export const clearTokens = (): void => {
  _accessToken = null;
  localStorage.removeItem('medera_refresh');
};

export const hasStoredSession = (): boolean =>
  !!localStorage.getItem('medera_refresh');
