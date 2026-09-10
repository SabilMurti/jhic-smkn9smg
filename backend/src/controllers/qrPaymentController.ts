import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { QrPaymentSession } from '../models/QrPaymentSession';
import { Merchant } from '../models/Merchant';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';

export async function createQrSession(req: Request, res: Response): Promise<void> {
  try {
    const { merchant_code, amount, description } = req.body;

    if (!merchant_code || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'merchant_code dan amount valid wajib diisi' });
      return;
    }

    const merchant = await Merchant.findOne({ code: merchant_code });
    if (!merchant) {
      res.status(404).json({ success: false, message: `Merchant ${merchant_code} tidak ditemukan` });
      return;
    }

    const sessionId = `QR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 menit TTL

    // Format string payload ala standar QRIS dinamis internal
    const qrDataPayload = JSON.stringify({
      app: 'myskanilan',
      type: 'dynamic_qr_payment',
      session_id: sessionId,
      merchant_code: merchant.code,
      merchant_name: merchant.name,
      amount,
      expires_at: expiresAt.toISOString()
    });

    const qrImageData = await QRCode.toDataURL(qrDataPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#0B0F17',
        light: '#FFFFFF'
      }
    });

    const session = await QrPaymentSession.create({
      session_id: sessionId,
      merchant_code: merchant.code,
      merchant_name: merchant.name,
      amount,
      description: description || `Pembayaran QRIS Kantin ${merchant.name}`,
      status: 'pending',
      qr_data: qrDataPayload,
      qr_image_data: qrImageData,
      expires_at: expiresAt
    });

    res.json({
      success: true,
      data: {
        session_id: session.session_id,
        merchant: {
          code: merchant.code,
          name: merchant.name
        },
        amount: session.amount,
        description: session.description,
        status: session.status,
        qr_image_data: session.qr_image_data,
        expires_at: session.expires_at,
        ttl_seconds: 180
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function checkQrStatus(req: Request, res: Response): Promise<void> {
  try {
    const { session_id } = req.params;
    const session = await QrPaymentSession.findOne({ session_id });

    if (!session) {
      res.status(404).json({ success: false, message: 'Sesi pembayaran QR tidak ditemukan' });
      return;
    }

    // Cek kedaluwarsa otomatis
    if (session.status === 'pending' && new Date() > session.expires_at) {
      session.status = 'expired';
      await session.save();
    }

    res.json({
      success: true,
      data: {
        session_id: session.session_id,
        status: session.status,
        amount: session.amount,
        paid_by_name: session.paid_by_name,
        expires_at: session.expires_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function payQrSession(req: Request, res: Response): Promise<void> {
  try {
    const { session_id, nisn } = req.body;

    if (!session_id || !nisn) {
      res.status(400).json({ success: false, message: 'session_id dan nisn siswa wajib diisi' });
      return;
    }

    const session = await QrPaymentSession.findOne({ session_id });
    if (!session) {
      res.status(404).json({ success: false, message: 'Sesi pembayaran QR tidak ditemukan' });
      return;
    }

    if (session.status === 'paid') {
      res.status(400).json({ success: false, message: 'QR Code ini sudah pernah dibayar sebelumnya' });
      return;
    }

    if (session.status === 'expired' || new Date() > session.expires_at) {
      session.status = 'expired';
      await session.save();
      res.status(400).json({ success: false, message: 'QR Code sudah kedaluwarsa (Maks 3 menit)' });
      return;
    }

    // 1. Cari siswa
    const student = await User.findOne({ nisn });
    if (!student) {
      res.status(404).json({ success: false, message: 'Data siswa pembayar tidak ditemukan' });
      return;
    }

    // 2. Cari dompet siswa
    const studentWallet = await Wallet.findOne({ user_id: student._id });
    if (!studentWallet || studentWallet.status !== 'active') {
      res.status(400).json({ success: false, message: 'Dompet siswa tidak aktif / dibekukan' });
      return;
    }

    // 3. Cek saldo cukup
    if (studentWallet.balance < session.amount) {
      res.status(422).json({
        success: false,
        code: 'INSUFFICIENT_FUNDS',
        message: `Saldo tidak mencukupi (Sisa saldo: Rp ${studentWallet.balance.toLocaleString('id-ID')}, Tagihan QR: Rp ${session.amount.toLocaleString('id-ID')})`
      });
      return;
    }

    // 4. Cari merchant
    const merchant = await Merchant.findOne({ code: session.merchant_code });
    const merchantWallet = merchant ? await Wallet.findById(merchant.wallet_id) : null;

    // 5. Potong saldo siswa & kreditkan ke merchant
    const balanceBefore = studentWallet.balance;
    studentWallet.balance -= session.amount;
    studentWallet.daily_limit.spent_today += session.amount;
    await studentWallet.save();

    if (merchantWallet) {
      merchantWallet.balance += session.amount;
      await merchantWallet.save();
    }

    // 6. Buat transaksi
    const tx = await Transaction.create({
      reference_no: `TX-QR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'payment',
      status: 'completed',
      amount: session.amount,
      source_wallet_id: studentWallet._id,
      destination_wallet_id: merchantWallet ? merchantWallet._id : undefined,
      merchant_code: session.merchant_code,
      payment_method: 'qr_code',
      description: session.description,
      balance_snapshot: {
        before: balanceBefore,
        after: studentWallet.balance
      }
    });

    // 7. Update status QR session
    session.status = 'paid';
    session.paid_by_user_id = student._id;
    session.paid_by_name = student.name;
    session.transaction_id = tx._id;
    await session.save();

    res.json({
      success: true,
      message: 'Pembayaran QR berhasil',
      data: {
        reference_no: tx.reference_no,
        amount: session.amount,
        merchant_name: session.merchant_name,
        student_name: student.name,
        balance_after: studentWallet.balance,
        paid_at: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function getMerchantStaticQr(req: Request, res: Response): Promise<void> {
  try {
    const { merchant_code } = req.params;
    const merchant = await Merchant.findOne({ code: merchant_code });
    if (!merchant) {
      res.status(404).json({ success: false, message: `Merchant ${merchant_code} tidak ditemukan` });
      return;
    }

    const staticQrPayload = JSON.stringify({
      app: 'myskanilan',
      type: 'static_qr_merchant',
      merchant_code: merchant.code,
      merchant_name: merchant.name,
      category: merchant.type
    });

    const qrImageData = await QRCode.toDataURL(staticQrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#0A0F1D',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        merchant_code: merchant.code,
        merchant_name: merchant.name,
        type: merchant.type,
        qr_data: staticQrPayload,
        qr_image_data: qrImageData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function payStaticQr(req: Request, res: Response): Promise<void> {
  try {
    const { merchant_code, nisn, amount, description } = req.body;

    if (!merchant_code || !nisn || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'merchant_code, nisn, dan nominal amount valid wajib diisi' });
      return;
    }

    // 1. Cari merchant
    const merchant = await Merchant.findOne({ code: merchant_code, status: 'active' });
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Stand kantin tidak ditemukan atau sedang tidak aktif' });
      return;
    }

    // 2. Cari siswa & dompet
    const student = await User.findOne({ nisn });
    if (!student) {
      res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan' });
      return;
    }

    const studentWallet = await Wallet.findOne({ user_id: student._id });
    if (!studentWallet || studentWallet.status !== 'active') {
      res.status(400).json({ success: false, code: 'WALLET_INACTIVE', message: 'Dompet siswa dibekukan / tidak aktif' });
      return;
    }

    // 3. Cek limit harian orang tua
    const today = new Date().toISOString().slice(0, 10);
    if (studentWallet.daily_limit.last_reset_date !== today) {
      studentWallet.daily_limit.spent_today = 0;
      studentWallet.daily_limit.last_reset_date = today;
    }

    if (studentWallet.daily_limit.spent_today + amount > studentWallet.daily_limit.max_amount) {
      const sisa = Math.max(0, studentWallet.daily_limit.max_amount - studentWallet.daily_limit.spent_today);
      res.status(422).json({
        success: false,
        code: 'DAILY_LIMIT_EXCEEDED',
        message: `Transaksi melampaui batas harian orang tua (Sisa kuota belanja hari ini: Rp ${sisa.toLocaleString('id-ID')})`
      });
      return;
    }

    // 4. Cek saldo cukup
    if (studentWallet.balance < amount) {
      res.status(422).json({
        success: false,
        code: 'INSUFFICIENT_FUNDS',
        message: `Saldo tidak mencukupi (Sisa saldo: Rp ${studentWallet.balance.toLocaleString('id-ID')}, Tagihan: Rp ${amount.toLocaleString('id-ID')})`
      });
      return;
    }

    // 5. Potong saldo siswa & kreditkan ke dompet merchant
    const merchantWallet = await Wallet.findById(merchant.wallet_id);

    const balanceBefore = studentWallet.balance;
    studentWallet.balance -= amount;
    studentWallet.daily_limit.spent_today += amount;
    await studentWallet.save();

    if (merchantWallet) {
      merchantWallet.balance += amount;
      await merchantWallet.save();
    }

    // 6. Buat transaksi
    const tx = await Transaction.create({
      reference_no: `TX-SQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'payment',
      status: 'completed',
      amount,
      source_wallet_id: studentWallet._id,
      destination_wallet_id: merchantWallet ? merchantWallet._id : undefined,
      merchant_code: merchant.code,
      payment_method: 'qr_code',
      description: description || `Pembayaran QRIS Statis ${merchant.name}`,
      balance_snapshot: {
        before: balanceBefore,
        after: studentWallet.balance
      }
    });

    res.json({
      success: true,
      message: 'Pembayaran QRIS Statis berhasil',
      data: {
        reference_no: tx.reference_no,
        amount,
        merchant_name: merchant.name,
        merchant_code: merchant.code,
        student_name: student.name,
        student_class: student.academic?.kelas,
        balance_after: studentWallet.balance,
        paid_at: tx.created_at || new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

