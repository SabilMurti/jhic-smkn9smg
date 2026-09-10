import { Router, Request, Response } from 'express';
import { lookupByRfid, getStudentProfile } from '../controllers/studentController';
import { chargeViaRfid, getWalletDetails, topUpWallet, payDirectOrder } from '../controllers/walletController';
import { createQrSession, checkQrStatus, payQrSession, getMerchantStaticQr, payStaticQr } from '../controllers/qrPaymentController';
import { freezeCard, unfreezeCard, setDailyLimit, getSystemStats, getAllCards } from '../controllers/portalController';
import { Merchant } from '../models/Merchant';

const router = Router();

// 1. Identity & Student Verification (Digunakan oleh SDK & Reader)
router.post('/open/identity/verify', lookupByRfid);
router.get('/portal/students/:nisn', getStudentProfile);

// 2. Financial Ledger & Wallet
router.post('/device/pay', chargeViaRfid);
router.get('/bank/wallet/:nisn', getWalletDetails);
router.post('/bank/wallet/topup', topUpWallet);
router.post('/order/pay-direct', payDirectOrder);

// 3. QR Code Payments (Dynamic POS & Static Stand Table)
router.post('/qr/generate', createQrSession);
router.get('/qr/status/:session_id', checkQrStatus);
router.post('/qr/pay', payQrSession);
router.get('/qr/merchant/:merchant_code/static', getMerchantStaticQr);
router.post('/qr/pay-static', payStaticQr);

// 4. Portal Security & Parental Controls
router.post('/portal/cards/freeze', freezeCard);
router.post('/portal/cards/unfreeze', unfreezeCard);
router.get('/portal/cards', getAllCards);
router.post('/portal/parent/daily-limit', setDailyLimit);
router.get('/portal/stats', getSystemStats);

// 5. Merchant List
router.get('/merchants', async (_req: Request, res: Response) => {
  try {
    const merchants = await Merchant.find({ status: 'active' });
    res.json({ success: true, data: merchants });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
