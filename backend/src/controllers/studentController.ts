import { Request, Response } from 'express';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { RfidCard } from '../models/RfidCard';

export async function lookupByRfid(req: Request, res: Response): Promise<void> {
  try {
    const { card_uid } = req.body;
    if (!card_uid) {
      res.status(400).json({ success: false, message: 'Field card_uid is required' });
      return;
    }

    const card = await RfidCard.findOne({ card_uid, status: 'active' });
    if (!card) {
      res.status(404).json({ success: false, message: 'Kartu RFID tidak terdaftar atau telah dinonaktifkan' });
      return;
    }

    const user = await User.findById(card.user_id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User pemilik kartu tidak ditemukan' });
      return;
    }

    const wallet = await Wallet.findOne({ user_id: user._id });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          nisn: user.nisn,
          name: user.name,
          email: user.email,
          role: user.role,
          academic: user.academic
        },
        card: {
          card_uid: card.card_uid,
          card_type: card.card_type,
          status: card.status
        },
        wallet: wallet ? {
          balance: wallet.balance,
          daily_limit: wallet.daily_limit,
          status: wallet.status
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}

export async function getStudentProfile(req: Request, res: Response): Promise<void> {
  try {
    const { nisn } = req.params;
    const user = await User.findOne({ nisn });
    if (!user) {
      res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
      return;
    }

    const wallet = await Wallet.findOne({ user_id: user._id });
    const card = await RfidCard.findOne({ user_id: user._id });
    res.json({
      success: true,
      data: { user, wallet, card }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
}
