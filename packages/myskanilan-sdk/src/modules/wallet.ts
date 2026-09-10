import { ChargeRequest, ChargeResult, DirectOrderRequest, DirectOrderResult } from '../types/index.js';

export class WalletModule {
  constructor(private baseUrl: string) {}

  /**
   * Mengeksekusi transaksi pemotongan saldo tertutup (Closed-Loop) via tap kartu RFID
   */
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/device/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_uid: req.cardUid,
        amount: req.amount,
        merchant_code: req.merchantCode,
        items: req.items,
        description: req.description
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const err = new Error(data.message || 'Transaksi pembayaran gagal');
      (err as any).code = data.code;
      throw err;
    }

    return data.data as ChargeResult;
  }

  /**
   * Mengeksekusi pembayaran langsung (direct wallet) ketika siswa memesan makanan via web kantin
   */
  async payDirectOrder(req: DirectOrderRequest): Promise<DirectOrderResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/order/pay-direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nisn: req.nisn,
        merchant_code: req.merchantCode,
        amount: req.amount,
        items: req.items,
        notes: req.notes,
        order_type: req.orderType || 'takeaway'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const err = new Error(data.message || 'Pembayaran langsung gagal');
      (err as any).code = data.code;
      throw err;
    }

    return data.data as DirectOrderResult;
  }

  /**
   * Mengambil ringkasan saldo & histori mutasi per siswa
   */
  async getDetails(nisn: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/bank/wallet/${nisn}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengambil informasi dompet');
    }
    return data.data;
  }

  /**
   * Top up saldo dompet siswa (oleh Orang Tua / Kasir Sekolah)
   */
  async topUp(params: { nisn: string; amount: number; paymentSource?: string }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/bank/wallet/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nisn: params.nisn,
        amount: params.amount,
        payment_source: params.paymentSource || 'va_bank_jateng'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal melakukan top up saldo');
    }
    return data.data;
  }
}

