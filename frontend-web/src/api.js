export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function getApiHealth() {
  const r = await fetch(`${API_BASE}/health`);
  if (!r.ok) {
    throw new Error(`GET /health failed: ${r.status}`);
  }
  return r.json();
}
