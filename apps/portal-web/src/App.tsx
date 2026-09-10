import React, { useState, useEffect } from 'react';
import { MySkanilanClient } from '@myskanilan/sdk';
import { CameraQrScanner, ScannedQrResult } from './components/CameraQrScanner';

const skanilan = new MySkanilanClient({ baseUrl: 'http://localhost:4000' });

type UserRole = 'siswa' | 'ortu' | 'kantin' | 'admin';

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('siswa');
  const [studentNisn, setStudentNisn] = useState<string>('0067812940'); // Budi Santoso
  const [studentData, setStudentData] = useState<any>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [merchantStaticQr, setMerchantStaticQr] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Parent Controls State
  const [parentDailyLimitInput, setParentDailyLimitInput] = useState<number>(75000);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);
  const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(50000);
  const [isTopUpProcessing, setIsTopUpProcessing] = useState(false);

  // Camera QR Scanner State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // 1. Dynamic QR Bill Modal State (Kasir POS dengan touchscreen)
  const [scannedDynamicBill, setScannedDynamicBill] = useState<{
    sessionId: string;
    merchantName?: string;
    amount?: number;
  } | null>(null);
  const [isConfirmingDynamicPay, setIsConfirmingDynamicPay] = useState(false);

  // 2. Static QR Modal State (Stand Kantin meja tanpa touchscreen)
  const [scannedStaticMerchant, setScannedStaticMerchant] = useState<{
    merchantCode: string;
    merchantName: string;
  } | null>(null);
  const [staticAmountInput, setStaticAmountInput] = useState<number>(10000);
  const [staticDescInput, setStaticDescInput] = useState<string>('');
  const [isConfirmingStaticPay, setIsConfirmingStaticPay] = useState(false);

  // Success Receipt Modal
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<any>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, walletRes, statsRes, cardsRes, staticQrRes] = await Promise.allSettled([
        skanilan.students.getByNisn(studentNisn),
        skanilan.wallet.getDetails(studentNisn),
        skanilan.portal.getStats(),
        skanilan.portal.getAllCards(),
        skanilan.qr.getMerchantStaticQr('KNT-U01')
      ]);

      if (profileRes.status === 'fulfilled') {
        setStudentData(profileRes.value);
      }
      if (walletRes.status === 'fulfilled') {
        setWalletData(walletRes.value);
        if (walletRes.value?.wallet?.daily_limit?.max_amount) {
          setParentDailyLimitInput(walletRes.value.wallet.daily_limit.max_amount);
        }
      }
      if (statsRes.status === 'fulfilled') {
        setSystemStats(statsRes.value);
      }
      if (cardsRes.status === 'fulfilled') {
        setAllCards(cardsRes.value);
      }
      if (staticQrRes.status === 'fulfilled') {
        setMerchantStaticQr(staticQrRes.value);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentNisn]);

  // Handler: Parent or Admin toggles Card Freeze
  const handleToggleFreeze = async (targetCardUid: string, currentStatus: string) => {
    setIsTogglingFreeze(true);
    try {
      if (currentStatus === 'frozen') {
        await skanilan.portal.unfreezeCard(targetCardUid);
        showToast('🔓 Kartu fisik & dompet berhasil diaktifkan kembali.');
      } else {
        await skanilan.portal.freezeCard({
          cardUid: targetCardUid,
          reason: activeRole === 'admin' ? 'Dibekukan oleh Admin Sistem SMKN 9' : 'Dibekukan darurat oleh Orang Tua'
        });
        showToast('🔒 1-Click Freeze: Kartu langsung dibekukan!');
      }
      loadData();
    } catch (err: any) {
      showToast(`⚠️ ${err.message || 'Gagal mengubah status kartu'}`);
    } finally {
      setIsTogglingFreeze(false);
    }
  };

  // Handler: Parent saves Daily Limit
  const handleSaveDailyLimit = async () => {
    setIsUpdatingLimit(true);
    try {
      await skanilan.portal.setDailyLimit(studentNisn, parentDailyLimitInput);
      showToast(`✅ Batas jajan harian berhasil diatur ke Rp ${parentDailyLimitInput.toLocaleString('id-ID')}`);
      loadData();
    } catch (err: any) {
      showToast(`⚠️ ${err.message || 'Gagal mengatur batas jajan'}`);
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  // Handler: Parent Tops Up Wallet
  const handleExecuteTopUp = async () => {
    if (topUpAmount <= 0) return;
    setIsTopUpProcessing(true);
    try {
      const res = await skanilan.wallet.topUp({
        nisn: studentNisn,
        amount: topUpAmount,
        paymentSource: 'virtual_account'
      });
      showToast(`🎉 Top Up Berhasil! Saldo bertambah Rp ${topUpAmount.toLocaleString('id-ID')}`);
      setIsTopUpModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(`⚠️ ${err.message || 'Gagal melakukan top up'}`);
    } finally {
      setIsTopUpProcessing(false);
    }
  };

  // Handler: QR Detection from Camera (Dispatch to Static or Dynamic)
  const handleQrDetected = (result: ScannedQrResult) => {
    setIsCameraScannerOpen(false);

    if (result.isStatic && result.merchantCode) {
      // Buka modal input nominal untuk QRIS Statis Meja
      setScannedStaticMerchant({
        merchantCode: result.merchantCode,
        merchantName: result.merchantName || 'Kantin Sekolah'
      });
      setStaticAmountInput(10000);
      setStaticDescInput('');
    } else if (result.sessionId) {
      // Buka modal konfirmasi untuk Dynamic QR Kasir
      setScannedDynamicBill({
        sessionId: result.sessionId,
        merchantName: result.merchantName,
        amount: result.amount
      });
    }
  };

  // Handler: Konfirmasi Bayar Dynamic QR
  const handleConfirmDynamicPay = async () => {
    if (!scannedDynamicBill) return;
    setIsConfirmingDynamicPay(true);
    try {
      const res = await skanilan.qr.paySession(scannedDynamicBill.sessionId, studentNisn);
      setLastPaymentReceipt({
        reference_no: res.reference_no,
        type: 'Dynamic QR (Kasir POS)',
        merchant_name: scannedDynamicBill.merchantName || 'Kantin Mbak Sri',
        amount: scannedDynamicBill.amount || res.amount,
        balance_after: res.balance_after,
        timestamp: new Date().toISOString()
      });
      setScannedDynamicBill(null);
      loadData();
      showToast('🎉 Pembayaran Dynamic QR Sukses!');
    } catch (err: any) {
      showToast(`⚠️ ${err.message || 'Pembayaran gagal diproses'}`);
    } finally {
      setIsConfirmingDynamicPay(false);
    }
  };

  // Handler: Konfirmasi Bayar Static QR (Nominal dimasukkan oleh Siswa)
  const handleConfirmStaticPay = async () => {
    if (!scannedStaticMerchant || staticAmountInput <= 0) return;
    setIsConfirmingStaticPay(true);
    try {
      const res = await skanilan.qr.payStaticQr({
        merchantCode: scannedStaticMerchant.merchantCode,
        nisn: studentNisn,
        amount: staticAmountInput,
        description: staticDescInput.trim() || `Pembayaran QRIS Meja ${scannedStaticMerchant.merchantName}`
      });

      setLastPaymentReceipt({
        reference_no: res.reference_no,
        type: 'Static QR (QRIS Meja Kantin)',
        merchant_name: res.merchant_name,
        amount: res.amount,
        balance_after: res.balance_after,
        timestamp: res.paid_at || new Date().toISOString()
      });
      setScannedStaticMerchant(null);
      loadData();
      showToast('🎉 Pembayaran QRIS Statis Berhasil!');
    } catch (err: any) {
      showToast(`⚠️ ${err.message || 'Pembayaran gagal diproses'}`);
    } finally {
      setIsConfirmingStaticPay(false);
    }
  };

  const balance = walletData?.wallet?.balance ?? 0;
  const spentToday = walletData?.wallet?.daily_limit?.spent_today ?? 0;
  const maxLimit = walletData?.wallet?.daily_limit?.max_amount ?? 75000;
  const isCardFrozen = studentData?.card?.status === 'frozen';
  const progressPct = Math.min(100, Math.round((spentToday / maxLimit) * 100));

  return (
    <div className="portal-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            color: '#fff',
            padding: '0.85rem 1.25rem',
            borderRadius: 14,
            fontSize: '0.9rem',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="portal-header">
        <div className="portal-brand">
          <div className="portal-logo-icon">🎓</div>
          <div>
            <h1 className="portal-title">MySkanilan Portal</h1>
            <p className="portal-subtitle">Ekosistem Terpadu SMKN 9 Semarang — Dynamic & Static QRIS</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {activeRole === 'siswa' && '👤 Siswa: Budi Santoso (XII RPL 1)'}
            {activeRole === 'ortu' && '👪 Wali: Hendra Santoso'}
            {activeRole === 'kantin' && '🏪 Stand #01: Kantin Mbak Sri'}
            {activeRole === 'admin' && '🏛️ Admin: Dra. Hj. Ratna (TU)'}
          </span>
        </div>
      </header>

      {/* Role Navigation Bar */}
      <nav className="role-nav-bar">
        <button
          className={`role-tab-btn ${activeRole === 'siswa' ? 'active' : ''}`}
          onClick={() => setActiveRole('siswa')}
        >
          <span>👨‍🎓</span>
          <span>Akun Siswa</span>
        </button>

        <button
          className={`role-tab-btn ${activeRole === 'ortu' ? 'active' : ''}`}
          onClick={() => setActiveRole('ortu')}
        >
          <span>👪</span>
          <span>Akun Orang Tua</span>
        </button>

        <button
          className={`role-tab-btn ${activeRole === 'kantin' ? 'active' : ''}`}
          onClick={() => setActiveRole('kantin')}
        >
          <span>🏪</span>
          <span>Akun Kantin (QR Meja)</span>
        </button>

        <button
          className={`role-tab-btn ${activeRole === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveRole('admin')}
        >
          <span>🏛️</span>
          <span>Admin Sekolah</span>
        </button>
      </nav>

      {/* =========================================================================
          VIEW 1: SISWA (STUDENT VIEW)
          - Tidak ada tombol Freeze (Admin/Ortu Only)
          - Tidak ada slider Atur Batas Belanja (Parental Only)
          - Bayar QR Kantin membuka KAMERA LIVE (Support Dynamic POS & Static QR Meja)
          - 3D Smart Card & Sisa Saldo
          ========================================================================= */}
      {activeRole === 'siswa' && (
        <>
          <div className="dashboard-grid">
            {/* Left: 3D Smart Card (No Freeze Button) */}
            <div className="card-section-wrapper">
              <div className="student-smart-card">
                <div className={`smart-card-inner ${isCardFrozen ? 'is-frozen' : ''}`}>
                  <div className="hologram-strip"></div>

                  <div className="card-top">
                    <div className="card-school-brand">
                      <div className="school-emblem">🏫</div>
                      <div>
                        <div className="school-name">SMKN 9 SEMARANG</div>
                        <div className="card-type-tag">KARTU PINTAR PELAJAR</div>
                      </div>
                    </div>
                    <div className={`card-status-pill ${isCardFrozen ? 'status-frozen' : 'status-active'}`}>
                      <span>{isCardFrozen ? '🔴 DIBEKUKAN' : '🟢 AKTIF'}</span>
                    </div>
                  </div>

                  <div className="chip-row">
                    <div className="gold-chip"></div>
                    <div className="contactless-waves">📡</div>
                  </div>

                  <div className="card-bottom">
                    <div>
                      <div className="student-fullname">{studentData?.user?.name || 'Budi Santoso'}</div>
                      <div className="student-meta">
                        NISN: {studentNisn} • {studentData?.user?.academic?.kelas || 'XII RPL 1'}
                      </div>
                    </div>
                    <div className="card-uid-mono">
                      UID: {studentData?.card?.card_uid?.match(/.{1,2}/g)?.join(':') || '04:A2:3F:89:BC:11:80'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Action: Buka Kamera QR & Pesan Web Kantin */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button
                  className="portal-action-btn btn-qr-scan"
                  style={{ width: '100%', padding: '0.85rem 1rem', fontSize: '0.92rem' }}
                  onClick={() => setIsCameraScannerOpen(true)}
                  disabled={isCardFrozen}
                >
                  <span style={{ fontSize: '1.3rem' }}>📷</span>
                  <span>Buka Kamera & Bayar QRIS Kantin</span>
                </button>

                <a
                  href={`http://localhost:5173?mode=student&nisn=${studentNisn}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.55rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                    transition: 'all 0.2s ease',
                    opacity: isCardFrozen ? 0.4 : 1,
                    pointerEvents: isCardFrozen ? 'none' : 'auto'
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>🍽️</span>
                  <span>Buka Web Kantin & Pesan Langsung ➔</span>
                </a>

                <p style={{ fontSize: '0.73rem', color: '#94a3b8', textAlign: 'center' }}>
                  Pesan online dari kelas, <strong>langsung bayar potong saldo SkanilanPay</strong> tanpa kartu!
                </p>
                {isCardFrozen && (
                  <p style={{ fontSize: '0.75rem', color: '#fb7185', textAlign: 'center', marginTop: '0.2rem' }}>
                    ⚠️ Kartu & dompet Anda sedang dibekukan oleh orang tua/admin sekolah.
                  </p>
                )}
              </div>
            </div>

            {/* Right: Balance & Read-Only Spending Progress */}
            <div className="wallet-hub-card">
              <div className="wallet-balance-header">
                <div>
                  <div className="balance-title">Saldo SkanilanPay Siswa</div>
                  <div className="balance-amount">
                    Rp {balance.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="closed-loop-badge">
                  🛡️ Dompet Tertutup (Bebas Biaya)
                </div>
              </div>

              {/* Read-Only Spending Progress Bar */}
              <div className="limit-section">
                <div className="limit-labels">
                  <span>Jajan Hari Ini: <strong>Rp {spentToday.toLocaleString('id-ID')}</strong></span>
                  <span>Batas Harian (Dari Wali): <strong>Rp {maxLimit.toLocaleString('id-ID')}</strong></span>
                </div>
                <div className="limit-progress-bg">
                  <div
                    className="limit-progress-fill"
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Sisa kuota jajan Anda hari ini:</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>
                    Rp {Math.max(0, maxLimit - spentToday).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Riwayat Mutasi Siswa */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#e2e8f0' }}>
                  Riwayat Mutasi Terakhir
                </div>
                {walletData?.recent_transactions?.length > 0 ? (
                  walletData.recent_transactions.slice(0, 4).map((tx: any) => (
                    <div key={tx._id} className="tx-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="tx-icon-pill">
                          {tx.type === 'payment' ? '🍲' : '💳'}
                        </div>
                        <div>
                          <div className="tx-title">{tx.description || 'Jajan Kantin'}</div>
                          <div className="tx-sub">
                            {new Date(tx.created_at || tx.createdAt).toLocaleTimeString('id-ID')} • {tx.payment_method}
                          </div>
                        </div>
                      </div>
                      <div className={tx.type === 'payment' ? 'tx-amount-debit' : 'tx-amount-credit'}>
                        {tx.type === 'payment' ? '-' : '+'} Rp {tx.amount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>
                    Belum ada transaksi hari ini.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* App Launcher */}
          <section className="ecosystem-section">
            <div className="section-heading">
              <span>🚀 Layanan Terhubung SMKN 9</span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                Single Sign-On Siswa
              </span>
            </div>
            <div className="apps-grid">
              <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="app-tile" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                <div>
                  <div className="app-tile-top">
                    <div className="app-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>🍲</div>
                    <span className="status-badge status-online">🟢 LIVE</span>
                  </div>
                  <div className="app-name">Kantin Skanilan POS</div>
                  <p className="app-desc">Layar kasir kasir pintar dengan pembayaran tap kartu dan dynamic QRIS.</p>
                </div>
                <div className="app-action-link">Buka Kasir ➔</div>
              </a>
              <div className="app-tile" style={{ opacity: 0.85 }}>
                <div>
                  <div className="app-tile-top">
                    <div className="app-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>📚</div>
                    <span className="status-badge status-sdk-ready">SDK READY</span>
                  </div>
                  <div className="app-name">Perpustakaan Digital</div>
                  <p className="app-desc">Peminjaman buku otomatis via RFID kartu pelajar SMKN 9.</p>
                </div>
              </div>
              <div className="app-tile" style={{ opacity: 0.85 }}>
                <div>
                  <div className="app-tile-top">
                    <div className="app-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>🚪</div>
                    <span className="status-badge status-sdk-ready">SDK READY</span>
                  </div>
                  <div className="app-name">Smart Turnstile Gate</div>
                  <p className="app-desc">Gerbang tap absensi sekolah otomatis terhubung notifikasi wali murid.</p>
                </div>
              </div>
              <div className="app-tile" style={{ opacity: 0.85 }}>
                <div>
                  <div className="app-tile-top">
                    <div className="app-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>🏷️</div>
                    <span className="status-badge status-sdk-ready">SDK READY</span>
                  </div>
                  <div className="app-name">Koperasi & SPP Smart</div>
                  <p className="app-desc">Pembayaran seragam dan iuran praktikum kejuruan.</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          VIEW 2: ORANG TUA / WALI MURID (PARENT VIEW)
          ========================================================================= */}
      {activeRole === 'ortu' && (
        <div className="role-view-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 600, textTransform: 'uppercase' }}>
                Parental Control & Security Hub
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                Panel Orang Tua: Budi Santoso (XII RPL 1)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Wali Murid: Hendra Santoso • Terhubung Resmi ke Sistem Pembayaran SMKN 9
              </p>
            </div>

            <button
              className="portal-action-btn"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', padding: '0.6rem 1.25rem' }}
              onClick={() => setIsTopUpModalOpen(true)}
            >
              💳 + Top Up Saldo Anak
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Card 1: Parental Limit Control Slider */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>🎚️ Atur Batas Belanja Harian Anak</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#6ee7b7', fontSize: '1.2rem' }}>
                  Rp {parentDailyLimitInput.toLocaleString('id-ID')}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                Batasi total nominal yang dapat dibelanjakan anak per hari di kantin sekolah untuk menjaga kedisiplinan keuangan.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="range"
                  min={10000}
                  max={150000}
                  step={5000}
                  value={parentDailyLimitInput}
                  onChange={(e) => setParentDailyLimitInput(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <button
                  className="portal-action-btn"
                  style={{ background: '#6366f1', color: '#fff', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={handleSaveDailyLimit}
                  disabled={isUpdatingLimit}
                >
                  {isUpdatingLimit ? 'Menyimpan...' : 'Simpan Limit'}
                </button>
              </div>
            </div>

            {/* Card 2: 1-Click Card Freeze Control */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>🛡️ Keamanan Kartu Fisik Anak</span>
                <span className={`card-status-pill ${isCardFrozen ? 'status-frozen' : 'status-active'}`}>
                  {isCardFrozen ? '🔴 DIBEKUKAN' : '🟢 AKTIF'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                Jika kartu pelajar RFID anak dilaporkan hilang atau tertinggal, bekukan seketika untuk mencegah penyalahgunaan.
              </p>

              <button
                className={`portal-action-btn ${isCardFrozen ? 'btn-unfreeze' : 'btn-freeze'}`}
                style={{ width: '100%', padding: '0.75rem' }}
                onClick={() => handleToggleFreeze(studentData?.card?.card_uid || '04A23F89BC1180', studentData?.card?.status || 'active')}
                disabled={isTogglingFreeze}
              >
                {isCardFrozen ? '🔓 Aktifkan Kembali Kartu Anak' : '🔒 1-Click Freeze (Bekukan Kartu Anak)'}
              </button>
            </div>
          </div>

          {/* Child Activity & Nutrition Audit */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
              📊 Laporan Transaksi & Konsumsi Sehat Anak
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 12 }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Saldo Tersisa Anak</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                  Rp {balance.toLocaleString('id-ID')}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 12 }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Jajan Terpakai Hari Ini</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
                  Rp {spentToday.toLocaleString('id-ID')}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 12 }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Kategori Makanan Utama</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                  🍗 Nasi Ayam & Sayur
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: KANTIN / MERCHANT VIEW (Termasuk QRIS Statis Meja Siap Cetak!)
          ========================================================================= */}
      {activeRole === 'kantin' && (
        <div className="role-view-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>
                Dashboard Mitra Kantin Sekolah
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                Kantin Mbak Sri (Stand #01 - Kantin Utara)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Kode Merchant: <code>KNT-U01</code> • Terdaftar Resmi BLUD SMKN 9 Semarang
              </p>
            </div>

            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="portal-action-btn"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', padding: '0.75rem 1.5rem', textDecoration: 'none' }}
            >
              🖥️ Buka Layar Kasir POS (Opsional) ➔
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', marginBottom: '2rem' }}>
            {/* Left: Summary Metrics */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.25rem', borderRadius: 18 }}>
                  <div style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>Total Omzet Kasir Hari Ini</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace', margin: '0.4rem 0' }}>
                    Rp {(systemStats?.total_volume || 54000).toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#34d399' }}>✓ 100% Zero MDR Fee (Bebas Biaya)</div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1.25rem', borderRadius: 18 }}>
                  <div style={{ fontSize: '0.8rem', color: '#93c5fd' }}>Transaksi Masuk</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace', margin: '0.4rem 0' }}>
                    {systemStats?.total_transactions || 4} Pembeli
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>Mendukung RFID & Static QR Meja</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                  💡 Cara Penggunaan Kantin Tanpa Touchscreen
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  Stand kantin yang tidak memiliki tablet kasir / laptop <strong>cukup mencetak QRIS Statis Meja</strong> di sebelah kanan dan meletakkannya di etalase makanan.
                </p>
                <ol style={{ fontSize: '0.85rem', color: '#cbd5e1', paddingLeft: '1.25rem', marginTop: '0.75rem', lineHeight: 1.8 }}>
                  <li>Siswa mengambil makanan dan membuka kamera di HP (Portal Siswa).</li>
                  <li>Siswa memindai QRIS Statis Meja ini.</li>
                  <li>Siswa memasukkan nominal sesuai harga belanjaan secara mandiri.</li>
                  <li>Siswa menunjukkan struk hijau di layar HP ke kasir kantin. Selesai!</li>
                </ol>
              </div>
            </div>

            {/* Right: Stand QRIS Akrilik Siap Cetak */}
            <div
              style={{
                background: '#fff',
                borderRadius: 24,
                padding: '1.5rem',
                color: '#000',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🏫</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b' }}>
                  QRIS STATIS SMKN 9 SEMARANG
                </span>
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Kantin Mbak Sri (Stand #01)
              </h4>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.75rem' }}>
                NMID: ID10260901001 • Stand Kantin Utara
              </p>

              {merchantStaticQr ? (
                <div style={{ margin: '0.5rem auto', width: 'fit-content' }}>
                  <img
                    src={merchantStaticQr.qr_image_data}
                    alt="QRIS Statis Meja Kantin"
                    style={{ width: 220, height: 220, display: 'block', borderRadius: 12, border: '2px solid #e2e8f0' }}
                  />
                </div>
              ) : (
                <div style={{ padding: '3rem 0', color: '#64748b', fontSize: '0.85rem' }}>Memuat QR Statis...</div>
              )}

              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>
                SCAN DENGAN KAMERA PORTAL SISWA
              </div>
              <p style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Nominal dimasukkan oleh siswa saat membayar
              </p>

              <button
                className="portal-action-btn"
                style={{ width: '100%', marginTop: '1rem', background: '#0f172a', color: '#fff', fontSize: '0.8rem' }}
                onClick={() => window.print()}
              >
                🖨️ Cetak QR Meja Stand Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: ADMIN SEKOLAH / TU VIEW
          ========================================================================= */}
      {activeRole === 'admin' && (
        <div className="role-view-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 600, textTransform: 'uppercase' }}>
                Central School Administration & Security
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                Manajemen Kartu Siswa & Kepatuhan Regulasi
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Administrator: Dra. Hj. Ratna (Kepala Bagian Tata Usaha SMKN 9 Semarang)
              </p>
            </div>
          </div>

          <table className="admin-card-table">
            <thead>
              <tr>
                <th>Nama Siswa</th>
                <th>NISN</th>
                <th>Jurusan / Kelas</th>
                <th>UID Kartu RFID</th>
                <th>Saldo Dompet</th>
                <th>Status Kartu</th>
                <th>Aksi Keamanan Admin</th>
              </tr>
            </thead>
            <tbody>
              {allCards.map((c: any) => (
                <tr key={c.card_uid}>
                  <td style={{ fontWeight: 700 }}>{c.user?.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{c.user?.nisn}</td>
                  <td>{c.user?.academic?.kelas} ({c.user?.academic?.jurusan})</td>
                  <td style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{c.card_uid}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                    Rp {(c.wallet?.balance || 0).toLocaleString('id-ID')}
                  </td>
                  <td>
                    <span className={`card-status-pill ${c.status === 'frozen' ? 'status-frozen' : 'status-active'}`}>
                      {c.status === 'frozen' ? 'DIBEKUKAN' : 'AKTIF'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`portal-action-btn ${c.status === 'frozen' ? 'btn-unfreeze' : 'btn-freeze'}`}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => handleToggleFreeze(c.card_uid, c.status)}
                    >
                      {c.status === 'frozen' ? 'Buka Blokir' : 'Bekukan Kartu'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating System Health Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Siswa Terdaftar</div>
          <div className="stat-val">{systemStats?.total_students || 2} Siswa</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Merchant Aktif</div>
          <div className="stat-val">{systemStats?.total_merchants || 1} Stand Kantin</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Total Transaksi Selesai</div>
          <div className="stat-val">{systemStats?.total_transactions || 4} trx</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Garansi Biaya Merchant</div>
          <div className="stat-val" style={{ color: '#34d399' }}>100% Zero Fee</div>
        </div>
      </div>

      {/* MODAL 1: Live Camera QR Scanner (Untuk Siswa) */}
      {isCameraScannerOpen && (
        <CameraQrScanner
          onScanSuccess={handleQrDetected}
          onClose={() => setIsCameraScannerOpen(false)}
        />
      )}

      {/* MODAL 2A: Bayar Dynamic QR (Kasir POS Layar) */}
      {scannedDynamicBill && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 24,
              padding: '2rem',
              maxWidth: 400,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🧾</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              Tagihan Dynamic Kasir Terdeteksi
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 1.25rem' }}>
              {scannedDynamicBill.merchantName || 'Kantin Mbak Sri (Stand #01)'}
            </p>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 16,
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>Total Tagihan</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                Rp {(scannedDynamicBill.amount || 15000).toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Ref Sesi: <code>{scannedDynamicBill.sessionId}</code>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                className="portal-action-btn"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                onClick={() => setScannedDynamicBill(null)}
              >
                Batal
              </button>
              <button
                className="portal-action-btn btn-qr-scan"
                onClick={handleConfirmDynamicPay}
                disabled={isConfirmingDynamicPay}
              >
                {isConfirmingDynamicPay ? 'Memproses...' : '✓ Bayar Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2B: Bayar Static QR (Siswa Memasukkan Nominal Sendiri!) */}
      {scannedStaticMerchant && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: 24,
              padding: '2rem',
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏷️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              QRIS Statis Stand Kantin
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#93c5fd', margin: '0.25rem 0 1rem' }}>
              {scannedStaticMerchant.merchantName} ({scannedStaticMerchant.merchantCode})
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Masukkan nominal jajan yang Anda beli di stand ini:
            </p>

            {/* Input Nominal */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#10b981', fontSize: '1.2rem' }}>
                Rp
              </span>
              <input
                type="number"
                value={staticAmountInput || ''}
                onChange={(e) => setStaticAmountInput(Number(e.target.value))}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 3rem',
                  borderRadius: 14,
                  background: 'rgba(0,0,0,0.4)',
                  border: '2px solid rgba(16, 185, 129, 0.4)',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  outline: 'none'
                }}
              />
            </div>

            {/* Quick Preset Buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
              {[4000, 8000, 12000, 15000, 20000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="portal-action-btn"
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    background: staticAmountInput === preset ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)',
                    borderColor: staticAmountInput === preset ? '#10b981' : 'transparent',
                    color: staticAmountInput === preset ? '#6ee7b7' : '#94a3b8'
                  }}
                  onClick={() => setStaticAmountInput(preset)}
                >
                  Rp {preset.toLocaleString('id-ID')}
                </button>
              ))}
            </div>

            {/* Catatan Belanja Opsional */}
            <input
              type="text"
              value={staticDescInput}
              onChange={(e) => setStaticDescInput(e.target.value)}
              placeholder="Catatan belanja (cth: Es Teh 1 + Bakso 1)"
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: 10,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '0.8rem',
                marginBottom: '1.25rem'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                className="portal-action-btn"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                onClick={() => setScannedStaticMerchant(null)}
              >
                Batal
              </button>
              <button
                className="portal-action-btn"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 800 }}
                onClick={handleConfirmStaticPay}
                disabled={isConfirmingStaticPay || staticAmountInput <= 0}
              >
                {isConfirmingStaticPay ? 'Memproses...' : '✓ Bayar Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Bukti Struk Digital Pembayaran Siswa */}
      {lastPaymentReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0b0f19',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 24,
              padding: '2rem',
              maxWidth: 400,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
              Pembayaran Berhasil!
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#34d399', marginBottom: '1.25rem' }}>
              Tunjukkan layar ini kepada penjual kantin
            </p>

            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '1.25rem',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Merchant:</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{lastPaymentReceipt.merchant_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Metode:</span>
                <span style={{ color: '#93c5fd' }}>{lastPaymentReceipt.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Ref:</span>
                <span style={{ color: '#cbd5e1' }}>{lastPaymentReceipt.reference_no}</span>
              </div>
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', margin: '0.75rem 0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800 }}>
                <span style={{ color: '#fff' }}>TOTAL BAYAR:</span>
                <span style={{ color: '#10b981' }}>
                  Rp {lastPaymentReceipt.amount.toLocaleString('id-ID')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Sisa Saldo Anda:</span>
                <span style={{ color: '#6ee7b7' }}>
                  Rp {lastPaymentReceipt.balance_after.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <button
              className="portal-action-btn"
              style={{ width: '100%', background: '#10b981', color: '#000', fontWeight: 800 }}
              onClick={() => setLastPaymentReceipt(null)}
            >
              Tutup Struk ➔
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Top Up Saldo Anak (Untuk Orang Tua) */}
      {isTopUpModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 24,
              padding: '2rem',
              maxWidth: 420,
              width: '100%',
              textAlign: 'center'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              💳 Top Up Saldo SkanilanPay
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Isi saldo untuk <strong>Budi Santoso</strong> via Virtual Account Bank Jateng (BLUD SMKN 9).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {[20000, 50000, 100000, 200000].map((amt) => (
                <button
                  key={amt}
                  className="portal-action-btn"
                  style={{
                    background: topUpAmount === amt ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.05)',
                    borderColor: topUpAmount === amt ? '#10b981' : 'transparent',
                    color: topUpAmount === amt ? '#6ee7b7' : '#fff'
                  }}
                  onClick={() => setTopUpAmount(amt)}
                >
                  Rp {amt.toLocaleString('id-ID')}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                className="portal-action-btn"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                onClick={() => setIsTopUpModalOpen(false)}
              >
                Tutup
              </button>
              <button
                className="portal-action-btn btn-unfreeze"
                style={{ background: '#10b981', color: '#000', fontWeight: 800 }}
                onClick={handleExecuteTopUp}
                disabled={isTopUpProcessing}
              >
                {isTopUpProcessing ? 'Memproses...' : 'Konfirmasi Top Up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
