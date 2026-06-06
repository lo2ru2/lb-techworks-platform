import axios from 'axios';
import { API_BASE, authHeaders } from './api';

/** Shkarkim me Bearer (export CSV/JSON/XLSX). */
export async function adminDownloadFile(pathWithQuery: string, filename: string) {
  const url = pathWithQuery.startsWith('http') ? pathWithQuery : `${API_BASE}${pathWithQuery}`;
  const res = await axios.get(url, {
    headers: authHeaders(),
    responseType: 'blob',
  });
  const ct = String(res.headers['content-type'] ?? 'application/octet-stream');
  const blob = new Blob([res.data], { type: ct });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
