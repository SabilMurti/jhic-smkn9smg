import { Request, Response } from 'express';
import { RfidCard } from '../models/RfidCard';
import { Wallet } from '../models/Wallet';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Merchant } from '../models/Merchant';

export async function freezeCard(req: Request, res: Response): Promise<void> {
  try {
    const { card_uid, reason } = req.body;
    if (!card_uid) {
      res.status(400).json({ success: false, message: 'card_uid wajib diisi' });
      return;
    }

    const card = await RfidCard.findOne({ card_uid });
    if (!card) {
      res.status(404).json({ success: false, message: 'Kartu tidak ditemukan' });
      return;
    }

    card.status = 'frozen';
    await card.save();

    // Bekukan juga dompet terkait
    const wallet = await Wallet.findOne({ user_id: card.user_id });
    if (wallet) {
      wallet.status = 'frozen';
      wallet.security_flags.is_frozen = true;
      wallet.security_flags.freeze_reason = reason || 'Dilaporkan hilang / dibekukan oleh pemilik';
      await wallet.save();
    }

    res.json({
      success: true,
      message: 'Kartu dan dompet berhasil dibekukan seketika (1-Click Freeze Sukses)',
      data: { card_uid, status: 'frozen' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function unfreezeCard(req: Request, res: Response): Promise<void> {
  try {
    const { card_uid } = req.body;
    const card = await RfidCard.findOne({ card_uid });
    if (!card) {
      res.status(404).json({ success: false, message: 'Kartu tidak ditemukan' });
      return;
    }

    card.status = 'active';
    await card.save();

    const wallet = await Wallet.findOne({ user_id: card.user_id });
    if (wallet) {
      wallet.status = 'active';
      wallet.security_flags.is_frozen = false;
      wallet.security_flags.freeze_reason = undefined;
      await wallet.save();
    }

    res.json({
      success: true,
      message: 'Kartu dan dompet berhasil diaktifkan kembali',
      data: { card_uid, status: 'active' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function setDailyLimit(req: Request, res: Response): Promise<void> {
  try {
    const { nisn, max_amount } = req.body;
    if (!nisn || !max_amount || max_amount <= 0) {
      res.status(400).json({ success: false, message: 'nisn dan max_amount valid wajib diisi' });
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

    wallet.daily_limit.max_amount = max_amount;
    await wallet.save();

    res.json({
      success: true,
      message: `Batas jajan harian untuk ${user.name} berhasil diubah menjadi Rp ${max_amount.toLocaleString('id-ID')}`,
      data: {
        nisn: user.nisn,
        max_amount: wallet.daily_limit.max_amount,
        spent_today: wallet.daily_limit.spent_today
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function getSystemStats(req: Request, res: Response): Promise<void> {
  try {
    const [totalUsers, totalMerchants, totalTransactions] = await Promise.all([
      User.countDocuments({ role: 'siswa' }),
      Merchant.countDocuments({ status: 'active' }),
      Transaction.countDocuments({})
    ]);

    const txSum = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalVolume: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        total_students: totalUsers,
        total_merchants: totalMerchants,
        total_transactions: totalTransactions,
        total_volume: txSum[0]?.totalVolume || 0,
        zero_merchant_fee_guarantee: '100% Zero Fee'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function getAllCards(req: Request, res: Response): Promise<void> {
  try {
    const cards = await RfidCard.find().populate('user_id').sort({ created_at: -1 });
    const formatted = await Promise.all(
      cards.map(async (c: any) => {
        const wallet = await Wallet.findOne({ user_id: c.user_id?._id });
        return {
          card_uid: c.card_uid,
          card_type: c.card_type,
          status: c.status,
          user: c.user_id,
          wallet: wallet ? {
            balance: wallet.balance,
            status: wallet.status,
            daily_limit: wallet.daily_limit
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

