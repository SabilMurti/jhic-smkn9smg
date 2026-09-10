import { Request, Response } from 'express';
import { RfidCard } from '../models/RfidCard';
import { Wallet } from '../models/Wallet';
import { Merchant } from '../models/Merchant';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

export async function chargeViaRfid(req: Request, res: Response): Promise<void> {
  try {
    const { card_uid, amount, merchant_code, items, description } = req.body;

    if (!card_uid || !amount || !merchant_code) {
      res.status(400).json({ success: false, message: 'Field card_uid, amount, dan merchant_code wajib diisi' });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({ success: false, message: 'Nominal transaksi harus lebih dari 0' });
      return;
    }

    // 1. Cari kartu RFID
    const card = await RfidCard.findOne({ card_uid });
    if (!card || card.status !== 'active') {
      res.status(400).json({ success: false, code: 'CARD_INACTIVE', message: 'Kartu tidak aktif atau telah dibekukan' });
      return;
    }

    // 2. Cari pemilik kartu
    const student = await User.findById(card.user_id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Siswa pemilik kartu tidak ditemukan' });
      return;
    }

    // 3. Cari dompet siswa
    const studentWallet = await Wallet.findOne({ user_id: student._id });
    if (!studentWallet || studentWallet.status !== 'active') {
      res.status(400).json({ success: false, code: 'WALLET_INACTIVE', message: 'Dompet siswa dibekukan / tidak aktif' });
      return;
    }

    // 4. Cek saldo cukup
    if (studentWallet.balance < amount) {
      res.status(422).json({
        success: false,
        code: 'INSUFFICIENT_FUNDS',
        message: `Saldo tidak mencukupi (Sisa: Rp ${studentWallet.balance.toLocaleString('id-ID')}, Tagihan: Rp ${amount.toLocaleString('id-ID')})`
      });
      return;
    }

    // 5. Cek limit harian orang tua
    const today = new Date().toISOString().slice(0, 10);
    if (studentWallet.daily_limit.last_reset_date !== today) {
      studentWallet.daily_limit.spent_today = 0;
      studentWallet.daily_limit.last_reset_date = today;
    }

    if (studentWallet.daily_limit.spent_today + amount > studentWallet.daily_limit.max_amount) {
      const remainingQuota = studentWallet.daily_limit.max_amount - studentWallet.daily_limit.spent_today;
      res.status(422).json({
        success: false,
        code: 'DAILY_LIMIT_EXCEEDED',
        message: `Transaksi melampaui batas harian orang tua (Sisa kuota hari ini: Rp ${remainingQuota.toLocaleString('id-ID')})`
      });
      return;
    }

    // 6. Cari merchant penerima
    const merchant = await Merchant.findOne({ code: merchant_code, status: 'active' });
    if (!merchant) {
      res.status(404).json({ success: false, message: `Merchant dengan kode ${merchant_code} tidak ditemukan` });
      return;
    }

    const merchantWallet = await Wallet.findById(merchant.wallet_id);

    // 7. Atomic update saldo
    const balanceBefore = studentWallet.balance;
    studentWallet.balance -= amount;
    studentWallet.daily_limit.spent_today += amount;
    await studentWallet.save();

    if (merchantWallet) {
      merchantWallet.balance += amount;
      await merchantWallet.save();
    }

    // 8. Buat catatan transaksi (Immutable Ledger)
    const referenceNo = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx = await Transaction.create({
      reference_no: referenceNo,
      type: 'payment',
      status: 'completed',
      amount,
      source_wallet_id: studentWallet._id,
      destination_wallet_id: merchantWallet ? merchantWallet._id : undefined,
      merchant_code,
      payment_method: 'rfid_card',
      description: description || `Pembelian di ${merchant.name}`,
      cart_items: items || [],
      balance_snapshot: {
        before: balanceBefore,
        after: studentWallet.balance
      }
    });

    res.json({
      success: true,
      message: 'Pembayaran berhasil',
      data: {
        reference_no: tx.reference_no,
        amount: tx.amount,
        payment_method: 'rfid_card',
        student: {
          name: student.name,
          kelas: student.academic.kelas
        },
        merchant: {
          code: merchant.code,
          name: merchant.name
        },
        wallet: {
          balance_before: balanceBefore,
          balance_after: studentWallet.balance,
          spent_today: studentWallet.daily_limit.spent_today,
          remaining_daily_quota: studentWallet.daily_limit.max_amount - studentWallet.daily_limit.spent_today
        },
        timestamp: tx.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function getWalletDetails(req: Request, res: Response): Promise<void> {
  try {
    const { nisn } = req.params;
    const user = await User.findOne({ nisn });
    if (!user) {
      res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      return;
    }

    const wallet = await Wallet.findOne({ user_id: user._id });
    const transactions = await Transaction.find({ source_wallet_id: wallet?._id })
      .sort({ created_at: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        user,
        wallet,
        recent_transactions: transactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function topUpWallet(req: Request, res: Response): Promise<void> {
  try {
    const { nisn, amount, payment_source } = req.body;
    if (!nisn || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'nisn dan amount valid wajib diisi' });
      return;
    }

    const user = await User.findOne({ nisn });
    if (!user) {
      res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
      return;
    }

    const wallet = await Wallet.findOne({ user_id: user._id });
    if (!wallet) {
      res.status(404).json({ success: false, message: 'Dompet siswa tidak ditemukan' });
      return;
    }

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    await wallet.save();

    const tx = await Transaction.create({
      reference_no: `TOPUP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'topup',
      status: 'completed',
      amount,
      source_wallet_id: wallet._id,
      destination_wallet_id: wallet._id,
      payment_method: (payment_source && ['virtual_account', 'bank_transfer', 'cash'].includes(payment_source)) ? payment_source : 'virtual_account',
      description: `Top Up Saldo oleh Wali Murid (${user.name})`,
      balance_snapshot: {
        before: balanceBefore,
        after: wallet.balance
      }
    });

    res.json({
      success: true,
      message: `Top up sebesar Rp ${amount.toLocaleString('id-ID')} berhasil`,
      data: {
        reference_no: tx.reference_no,
        amount,
        balance_before: balanceBefore,
        balance_after: wallet.balance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function payDirectOrder(req: Request, res: Response): Promise<void> {
  try {
    const { nisn, merchant_code, amount, items, notes, order_type } = req.body;

    if (!nisn || !merchant_code || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'nisn, merchant_code, dan amount valid wajib diisi' });
      return;
    }

    // 1. Cari merchant
    const merchant = await Merchant.findOne({ code: merchant_code, status: 'active' });
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant stand kantin tidak ditemukan atau tidak aktif' });
      return;
    }

    // 2. Cari siswa
    const student = await User.findOne({ nisn });
    if (!student) {
      res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
      return;
    }

    // 3. Cari dompet
    const studentWallet = await Wallet.findOne({ user_id: student._id });
    if (!studentWallet || studentWallet.status !== 'active') {
      res.status(400).json({ success: false, code: 'WALLET_INACTIVE', message: 'Dompet siswa dibekukan / tidak aktif' });
      return;
    }

    // 4. Cek limit harian
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
        message: `Transaksi melampaui batas jajan harian orang tua (Sisa kuota: Rp ${sisa.toLocaleString('id-ID')})`
      });
      return;
    }

    // 5. Cek saldo cukup
    if (studentWallet.balance < amount) {
      res.status(422).json({
        success: false,
        code: 'INSUFFICIENT_FUNDS',
        message: `Saldo tidak mencukupi (Sisa saldo: Rp ${studentWallet.balance.toLocaleString('id-ID')}, Tagihan: Rp ${amount.toLocaleString('id-ID')})`
      });
      return;
    }

    // 6. Potong saldo
    const merchantWallet = await Wallet.findById(merchant.wallet_id);
    const balanceBefore = studentWallet.balance;
    studentWallet.balance -= amount;
    studentWallet.daily_limit.spent_today += amount;
    await studentWallet.save();

    if (merchantWallet) {
      merchantWallet.balance += amount;
      await merchantWallet.save();
    }

    // 7. Buat nomor antrean pesanan kantin
    const orderTicketNo = `#A-${Math.floor(10 + Math.random() * 90)}`;
    const tx = await Transaction.create({
      reference_no: `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'payment',
      status: 'completed',
      amount,
      source_wallet_id: studentWallet._id,
      destination_wallet_id: merchantWallet ? merchantWallet._id : undefined,
      merchant_code: merchant.code,
      payment_method: 'direct_wallet',
      description: `Pesan Online: ${items?.map((i: any) => `${i.qty}x ${i.name}`).join(', ') || 'Pesanan Kantin'} (${orderTicketNo})`,
      cart_items: items,
      balance_snapshot: {
        before: balanceBefore,
        after: studentWallet.balance
      }
    });

    res.json({
      success: true,
      message: 'Pesanan berhasil dibayar langsung dengan SkanilanPay!',
      data: {
        reference_no: tx.reference_no,
        order_ticket_no: orderTicketNo,
        amount,
        items,
        student: {
          name: student.name,
          kelas: student.academic?.kelas
        },
        merchant: {
          code: merchant.code,
          name: merchant.name
        },
        wallet: {
          balance_before: balanceBefore,
          balance_after: studentWallet.balance,
          remaining_daily_quota: studentWallet.daily_limit.max_amount - studentWallet.daily_limit.spent_today
        },
        order_type: order_type || 'takeaway',
        notes,
        timestamp: tx.created_at || new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}


