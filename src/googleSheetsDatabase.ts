import { CertificateConfig, Kegiatan, Participant } from './types';

export interface GoogleSheetsDbPayload {
  kegiatanList: Kegiatan[];
  participants: Participant[];
  config: CertificateConfig;
  selectedKegiatanId?: string;
  syncedAt?: string;
}

export interface GoogleSheetsDbResult {
  ok: boolean;
  message?: string;
  payload?: GoogleSheetsDbPayload;
}

const normalizeEndpoint = (endpoint: string) => endpoint.trim();

export const saveGoogleSheetsDatabase = async (
  endpoint: string,
  payload: GoogleSheetsDbPayload
): Promise<GoogleSheetsDbResult> => {
  const url = normalizeEndpoint(endpoint);
  if (!url) {
    throw new Error('URL Web App Google Sheets belum diisi.');
  }

  const body = JSON.stringify({
    action: 'saveAll',
    payload: {
      ...payload,
      syncedAt: new Date().toISOString(),
    },
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body,
      redirect: 'follow',
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : { ok: response.ok };
    if (!response.ok || parsed.ok === false) {
      throw new Error(parsed.message || 'Google Sheets menolak sinkronisasi.');
    }
    return parsed;
  } catch (err) {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body,
      mode: 'no-cors',
    });
    return {
      ok: true,
      message: 'Permintaan sinkronisasi dikirim ke Google Sheets.',
    };
  }
};

export const loadGoogleSheetsDatabase = (endpoint: string): Promise<GoogleSheetsDbPayload> => {
  const url = normalizeEndpoint(endpoint);
  if (!url) {
    throw new Error('URL Web App Google Sheets belum diisi.');
  }

  return new Promise((resolve, reject) => {
    const callbackName = `ansorSheetsCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const separator = url.includes('?') ? '&' : '?';
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Koneksi ke Google Sheets terlalu lama. Cek URL Web App dan izin aksesnya.'));
    }, 20000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      delete (window as any)[callbackName];
      script.remove();
    };

    (window as any)[callbackName] = (result: GoogleSheetsDbResult) => {
      cleanup();
      if (!result?.ok || !result.payload) {
        reject(new Error(result?.message || 'Data online belum tersedia atau formatnya tidak valid.'));
        return;
      }
      resolve(result.payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Gagal memuat database online. Pastikan Web App Google Apps Script sudah dideploy untuk Anyone.'));
    };

    script.src = `${url}${separator}action=load&callback=${callbackName}&t=${Date.now()}`;
    document.body.appendChild(script);
  });
};
