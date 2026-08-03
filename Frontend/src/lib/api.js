export const API_URL = "http://127.0.0.1:8000/api";

/**
 * Custom fetch wrapper that automatically attaches authorization token
 * and prepends the API base URL.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  // Format headers
  const headers = {
    ...(options.headers || {}),
  };

  // Add token if user is logged in
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Handle URL building clean of double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${cleanEndpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

// Export as default so default imports like `import apiFetch from '...'` work as well
export default apiFetch;