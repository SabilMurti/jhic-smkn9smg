import { StudentRfidLookupResult } from '../types/index.js';

export class StudentsModule {
  constructor(private baseUrl: string) {}

  /**
   * Mengambil data siswa lengkap berdasarkan tap kartu fisik RFID (Mifare Ultralight C)
   */
  async getByCardUid(cardUid: string): Promise<StudentRfidLookupResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/open/identity/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_uid: cardUid })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal memverifikasi kartu RFID');
    }

    return data.data as StudentRfidLookupResult;
  }

  /**
   * Mengambil profil siswa berdasarkan NISN
   */
  async getByNisn(nisn: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/portal/students/${nisn}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Siswa tidak ditemukan');
    }
    return data.data;
  }
}
