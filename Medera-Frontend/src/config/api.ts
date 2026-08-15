export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
export const AI_SERVICE_URL = (import.meta.env.VITE_AI_SERVICE_URL as string) || `${window.location.protocol}//${window.location.hostname}:5000`;
export const AI_TOKEN = (import.meta.env.VITE_AI_TOKEN as string) || 'medera-internal-secret-token-dev';
