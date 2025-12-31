/**
 * Centralized API Configuration
 * Supports both local development and Docker/production environments
 */

const getAPIBase = () => {
  // First priority: explicit environment variable (for Docker or deployed backends)
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE.replace(/\/$/, '');
  }

  // Second priority: alternative env variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }

  // Default fallback: localhost for local development
  // To use Docker backend, set REACT_APP_API_BASE=http://localhost:5001 or use docker run -p 5001:5001
  return 'http://localhost:5001';
};

export const API_BASE = getAPIBase();

export const API_ENDPOINTS = {
  search: {
    autocomplete: (query) => `${API_BASE}/api/search?q=${encodeURIComponent(query)}`,
    submit: () => `${API_BASE}/api/search`,
  },
  locations: {
    all: () => `${API_BASE}/api/locations`,
    byName: (name) => `${API_BASE}/api/locations/${encodeURIComponent(name)}`,
  },
  topPlaces: () => `${API_BASE}/api/top-places`,
  debug: {
    locations: () => `${API_BASE}/api/debug/locations`,
  },
};

export default API_BASE;
