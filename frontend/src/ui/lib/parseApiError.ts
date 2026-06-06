import axios from 'axios';

/** Lexon mesazhin nga përgjigjet NestJS / class-validator. */
export function parseApiError(e: unknown, fallback = 'Kërkesa dështoi. Provo përsëri.'): string {
  if (axios.isAxiosError(e)) {
    if (e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED' || !e.response) {
      return (
        'Nuk lidhet me serverin API. Nisni backend-in në port 3001 (nga rrënja: npm run dev, ose: ' +
        'npm run dev:backend). Në dev, frontend-i përdor proxy /api — sigurohu që Nest është aktiv.'
      );
    }

    const d = e.response.data as {
      message?: string | string[] | Array<{ constraints?: Record<string, string> }>;
      error?: string;
    };

    if (typeof d.message === 'string' && d.message.trim()) return d.message;

    if (Array.isArray(d.message)) {
      const parts = d.message.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.constraints) {
          return Object.values(item.constraints).join(', ');
        }
        return null;
      });
      const joined = parts.filter(Boolean).join('. ');
      if (joined) return joined;
    }

    if (e.response.status === 409) return 'Ky email është i regjistruar.';
    if (typeof d.error === 'string' && d.error.trim()) {
      return `${d.error} (${e.response.status})`;
    }
    return `${fallback} (HTTP ${e.response.status})`;
  }

  return fallback;
}
