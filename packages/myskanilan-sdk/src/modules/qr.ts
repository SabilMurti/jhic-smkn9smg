import { QrSessionResult, QrStatusResult } from '../types/index.js';

export class QrPaymentModule {
  constructor(private baseUrl: string) {}

  /**
   * Membuat sesi pembayaran QR Dinamis (ala QRIS) dengan nominal pas dan batas kedaluwarsa 3 menit
   */
  async createPaymentSession(params: {
    merchantCode: string;
    amount: number;
    description?: string;
  }): Promise<QrSessionResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/qr/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_code: params.merchantCode,
        amount: params.amount,
        description: params.description
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal membuat QR Code pembayaran');
    }

    return data.data as QrSessionResult;
  }

  /**
   * Mengecek status apakah QR Code sudah dibayar oleh siswa
   */
  async checkStatus(sessionId: string): Promise<QrStatusResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/qr/status/${sessionId}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengecek status QR');
    }
    return data.data as QrStatusResult;
  }

  /**
   * Polling otomatis sampai siswa menyelesaikan pembayaran di layar kasir
   */
  async pollUntilPaid(
    sessionId: string,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      onPoll?: (status: string) => void;
    } = {}
  ): Promise<QrStatusResult> {
    const interval = options.intervalMs || 1500;
    const timeout = options.timeoutMs || 180000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          if (Date.now() - startTime > timeout) {
            clearInterval(timer);
            return reject(new Error('Waktu pembayaran QR telah kedaluwarsa'));
          }

          const statusResult = await this.checkStatus(sessionId);
          if (options.onPoll) {
            options.onPoll(statusResult.status);
          }

          if (statusResult.status === 'paid') {
            clearInterval(timer);
            resolve(statusResult);
          } else if (statusResult.status === 'expired') {
            clearInterval(timer);
            reject(new Error('QR Code telah kedaluwarsa'));
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, interval);
    });
  }

  /**
   * Simulasi Siswa scan & bayar QR dari aplikasi/portal siswa
   */
  async paySession(sessionId: string, nisn: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/qr/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, nisn })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const err = new Error(data.message || 'Pembayaran QR gagal');
      (err as any).code = data.code;
      throw err;
    }
    return data.data;
  }

  /**
   * Mengambil gambar & payload QRIS Statis meja untuk merchant/stand kantin tertentu
   */
  async getMerchantStaticQr(merchantCode: string): Promise<{
    merchant_code: string;
    merchant_name: string;
    type: string;
    qr_data: string;
    qr_image_data: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/v1/qr/merchant/${merchantCode}/static`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengambil QR Statis merchant');
    }
    return data.data;
  }

  /**
   * Mengeksekusi pembayaran QRIS Statis di mana nominal diinput oleh siswa
   */
  async payStaticQr(params: {
    merchantCode: string;
    nisn: string;
    amount: number;
    description?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/qr/pay-static`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_code: params.merchantCode,
        nisn: params.nisn,
        amount: params.amount,
        description: params.description
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const err = new Error(data.message || 'Pembayaran QRIS Statis gagal');
      (err as any).code = data.code;
      throw err;
    }
    return data.data;
  }
}

