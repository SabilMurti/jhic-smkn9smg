import { FreezeCardRequest, MerchantInfo, SystemStatsResult } from '../types/index.js';

export class PortalModule {
  constructor(private baseUrl: string) {}

  /**
   * 1-Click Freeze kartu fisik & dompet jika kartu dilaporkan hilang
   */
  async freezeCard(req: FreezeCardRequest): Promise<{ card_uid: string; status: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/portal/cards/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_uid: req.cardUid,
        reason: req.reason || 'Dibekukan melalui Portal Siswa/Wali'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal membekukan kartu');
    }

    return data.data;
  }

  /**
   * Membuka blokir / unfreeze kartu
   */
  async unfreezeCard(cardUid: string): Promise<{ card_uid: string; status: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/portal/cards/unfreeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_uid: cardUid })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengaktifkan kartu kembali');
    }

    return data.data;
  }

  /**
   * Mengatur batas belanja harian siswa (Parental Control)
   */
  async setDailyLimit(nisn: string, maxAmount: number): Promise<{ nisn: string; max_amount: number; spent_today: number }> {
    const res = await fetch(`${this.baseUrl}/api/v1/portal/parent/daily-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nisn,
        max_amount: maxAmount
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengatur limit harian');
    }

    return data.data;
  }

  /**
   * Mengambil statistik ekosistem MySkanilan
   */
  async getStats(): Promise<SystemStatsResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/portal/stats`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengambil statistik sistem');
    }
    return data.data;
  }

  /**
   * Mengambil daftar merchant terdaftar yang aktif di ekosistem
   */
  async getMerchants(): Promise<MerchantInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/merchants`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengambil daftar merchant');
    }
    return data.data;
  }

  /**
   * Mengambil seluruh daftar kartu siswa untuk dashboard Admin Sekolah
   */
  async getAllCards(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/portal/cards`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengambil daftar kartu');
    }
    return data.data;
  }
}

