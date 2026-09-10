import React, { useState, useEffect } from 'react';
import { CANTEEN_MENU, MenuItem } from './data/menu';
// Import SDK client
import { MySkanilanClient } from '@myskanilan/sdk';

const skanilan = new MySkanilanClient({ baseUrl: 'http://localhost:4000' });
const MERCHANT_CODE = 'KNT-U01';
const MERCHANT_NAME = 'Kantin Mbak Sri';

interface CartItem {
  item: MenuItem;
  qty: number;
}

export default function App() {
  // Mode: Student Self-Order vs Cashier POS
  const [mode, setMode] = useState<'student' | 'cashier'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'cashier' ? 'cashier' : 'student';
  });

  // Active Student State (Default Budi Santoso)
  const [studentNisn, setStudentNisn] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('nisn') || '0067812940';
  });
  const [studentData, setStudentData] = useState<any>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');

  // Modals
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isOrderTicketModalOpen, setIsOrderTicketModalOpen] = useState(false);

  // RFID State
  const [rfidInput, setRfidInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // QR State
  const [qrSession, setQrSession] = useState<any>(null);
  const [qrTimeLeft, setQrTimeLeft] = useState(180);
  const [qrPaidStatus, setQrPaidStatus] = useState<any>(null);

  // Completed Transaction State
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [orderTicketResult, setOrderTicketResult] = useState<any>(null);

  // Load Student Wallet & Info
  const loadStudentWallet = async (nisn: string) => {
    try {
      const data = await skanilan.wallet.getDetails(nisn);
      setStudentData(data);
    } catch (e) {
      console.error('Gagal mengambil data saldo siswa:', e);
    }
  };

  useEffect(() => {
    loadStudentWallet(studentNisn);
  }, [studentNisn]);

  // Cart Management
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, qty: ci.qty + 1 } : ci
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.item.id === id) {
            const newQty = ci.qty + delta;
            return newQty > 0 ? { ...ci, qty: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce(
    (sum, ci) => sum + ci.item.price * ci.qty,
    0
  );

  const filteredMenu =
    activeCategory === 'all'
      ? CANTEEN_MENU
      : CANTEEN_MENU.filter((m) => m.category === activeCategory);

  // DIRECT WALLET PAYMENT (Pesan Mandiri & Bayar Langsung Potong Saldo)
  const executeDirectPayment = async () => {
    if (totalAmount <= 0) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const itemsPayload = cart.map((ci) => ({
        name: ci.item.name,
        qty: ci.qty,
        price: ci.item.price
      }));

      const result = await skanilan.wallet.payDirectOrder({
        nisn: studentNisn,
        merchantCode: MERCHANT_CODE,
        amount: totalAmount,
        items: itemsPayload,
        notes: orderNotes.trim() || undefined
      });

      setOrderTicketResult(result);
      setIsOrderTicketModalOpen(true);
      clearCart();
      setOrderNotes('');
      // Refresh wallet balance
      loadStudentWallet(studentNisn);
    } catch (err: any) {
      setErrorMessage(err.message || 'Pembayaran langsung gagal diproses');
    } finally {
      setIsProcessing(false);
    }
  };

  // RFID Payment Execution (Mode Kasir)
  const executeRfidPayment = async (cardUid: string) => {
    if (!cardUid.trim()) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const itemsPayload = cart.map((ci) => ({
        name: ci.item.name,
        qty: ci.qty,
        price: ci.item.price
      }));

      const result = await skanilan.wallet.charge({
        cardUid: cardUid.trim(),
        amount: totalAmount,
        merchantCode: MERCHANT_CODE,
        items: itemsPayload,
        description: `Pembelian Kantin (${cart.length} item)`
      });

      setLastReceipt({
        ...result,
        items: cart,
        method: 'RFID Tap (Mifare Ultralight C)'
      });
      setIsRfidModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      loadStudentWallet(studentNisn);
    } catch (err: any) {
      setErrorMessage(err.message || 'Pembayaran kartu gagal.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Dynamic QR Payment Initiation (Mode Kasir / QRIS)
  const startQrPayment = async () => {
    if (totalAmount <= 0) return;
    setIsProcessing(true);
    setErrorMessage('');
    setIsQrModalOpen(true);
    setQrSession(null);
    setQrPaidStatus(null);
    setQrTimeLeft(180);

    try {
      const session = await skanilan.qr.createPaymentSession({
        merchantCode: MERCHANT_CODE,
        amount: totalAmount,
        description: `Belanja Kantin Skanilan Rp ${totalAmount.toLocaleString('id-ID')}`
      });

      setQrSession(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat QR Code.');
    } finally {
      setIsProcessing(false);
    }
  };

  // QR Timer & Polling
  useEffect(() => {
    let timer: any;
    let pollInterval: any;

    if (isQrModalOpen && qrSession && !qrPaidStatus) {
      // Countdown
      timer = setInterval(() => {
        setQrTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Polling check
      pollInterval = setInterval(async () => {
        try {
          const statusResult = await skanilan.qr.checkStatus(qrSession.session_id);
          if (statusResult.status === 'paid') {
            clearInterval(pollInterval);
            setQrPaidStatus(statusResult);
            setLastReceipt({
              reference_no: `QR-${qrSession.session_id.substring(0, 8)}`,
              amount: totalAmount,
              payment_method: 'Dynamic QR (QRIS-style)',
              student: { name: statusResult.paid_by_name || 'Siswa Skanilan', kelas: 'XII PPLG 1' },
              merchant: { code: MERCHANT_CODE, name: MERCHANT_NAME },
              wallet: { balance_after: 0 },
              timestamp: new Date().toISOString(),
              items: cart
            });
            setTimeout(() => {
              setIsQrModalOpen(false);
              setIsReceiptModalOpen(true);
              clearCart();
              loadStudentWallet(studentNisn);
            }, 1200);
          }
        } catch (e) {
          // ignore transient errors
        }
      }, 1500);
    }

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [isQrModalOpen, qrSession, qrPaidStatus, totalAmount, cart]);

  // Helper Simulation for User to Pay QR immediately
  const simulateStudentScanAndPay = async () => {
    if (!qrSession) return;
    try {
      setIsProcessing(true);
      await skanilan.qr.paySession(qrSession.session_id, studentNisn);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal simulasi bayar');
    } finally {
      setIsProcessing(false);
    }
  };

  const studentBalance = studentData?.wallet?.balance ?? 0;
  const studentDailyLimit = studentData?.wallet?.daily_limit?.max_amount ?? 200000;
  const studentSpentToday = studentData?.wallet?.daily_limit?.spent_today ?? 0;
  const remainingDailyQuota = Math.max(0, studentDailyLimit - studentSpentToday);

  return (
    <div className="pos-layout">
      {/* Catalog & Main Window */}
      <div className="catalog-section">
        {/* Header */}
        <header className="pos-header">
          <div className="brand-badge">
            <div className="brand-logo">🍲</div>
            <div>
              <h1 className="brand-title">Kantin Skanilan Web</h1>
              <p className="brand-subtitle">Platform Pemesanan & Kasir Mandiri SMKN 9 Semarang</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Mode Switcher */}
            <div className="mode-toggle-group">
              <button
                className={`mode-toggle-btn ${mode === 'student' ? 'active student' : ''}`}
                onClick={() => setMode('student')}
              >
                <span>📱</span>
                <span>Mode Siswa (Self-Order)</span>
              </button>
              <button
                className={`mode-toggle-btn ${mode === 'cashier' ? 'active' : ''}`}
                onClick={() => setMode('cashier')}
              >
                <span>🏪</span>
                <span>Kasir Stand</span>
              </button>
            </div>

            <div className="merchant-pill">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
              <span>{MERCHANT_NAME} (#01)</span>
            </div>
          </div>
        </header>

        {/* Student Session Bar (Mode Siswa) */}
        {mode === 'student' && (
          <div className="student-banner">
            <div className="student-info-chip">
              <div className="student-avatar-badge">👤</div>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{studentData?.user?.name || 'Budi Santoso'}</span>
                  <span style={{ fontSize: '0.65rem', background: '#8b5cf6', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                    Siswa Aktif
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  NISN: {studentNisn} • {studentData?.user?.academic?.kelas || 'XII RPL 1'}
                </div>
              </div>
            </div>

            <div className="student-wallet-pills">
              <div className="wallet-stat-pill">
                <span>💰 Saldo SkanilanPay:</span>
                <strong>Rp {studentBalance.toLocaleString('id-ID')}</strong>
              </div>
              <div className="wallet-stat-pill">
                <span>🛡️ Sisa Kuota Hari Ini:</span>
                <strong style={{ color: remainingDailyQuota < totalAmount ? '#f87171' : '#60a5fa' }}>
                  Rp {remainingDailyQuota.toLocaleString('id-ID')}
                </strong>
              </div>
              <select
                value={studentNisn}
                onChange={(e) => setStudentNisn(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#cbd5e1',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  padding: '0.25rem 0.5rem',
                  cursor: 'pointer'
                }}
                title="Ganti Siswa untuk Simulasi"
              >
                <option value="0067812940">Budi Santoso (XII RPL 1)</option>
                <option value="0067812941">Siti Aminah (XII TB 2)</option>
              </select>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="catalog-nav">
          <button
            className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            Semua Menu
          </button>
          <button
            className={`category-tab ${activeCategory === 'makanan' ? 'active' : ''}`}
            onClick={() => setActiveCategory('makanan')}
          >
            🍗 Makanan Berat
          </button>
          <button
            className={`category-tab ${activeCategory === 'minuman' ? 'active' : ''}`}
            onClick={() => setActiveCategory('minuman')}
          >
            🧋 Minuman Dingin
          </button>
          <button
            className={`category-tab ${activeCategory === 'snack' ? 'active' : ''}`}
            onClick={() => setActiveCategory('snack')}
          >
            🍞 Camilan & Snack
          </button>
        </div>

        {/* Menu Grid */}
        <div className="menu-scrollable">
          <div className="menu-grid">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="menu-card"
                onClick={() => addToCart(item)}
              >
                <div>
                  <div className="menu-card-top">
                    <div className="menu-emoji">{item.emoji}</div>
                  </div>
                  <h3 className="menu-name">{item.name}</h3>
                  <p className="menu-desc">{item.description}</p>
                </div>
                <div className="menu-card-bottom">
                  <span className="menu-price">
                    Rp {item.price.toLocaleString('id-ID')}
                  </span>
                  <button className="add-btn">+ Tambah</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <aside className="cart-sidebar">
        <div className="cart-header">
          <div className="cart-title">
            <span>Keranjang</span>
            <span className="cart-badge">
              {cart.reduce((s, ci) => s + ci.qty, 0)} item
            </span>
          </div>
          {cart.length > 0 && (
            <button className="clear-cart-btn" onClick={clearCart}>
              Kosongkan
            </button>
          )}
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <span style={{ fontSize: '2.5rem' }}>🛒</span>
              <p style={{ fontWeight: 600 }}>Keranjang Masih Kosong</p>
              <p style={{ fontSize: '0.8rem' }}>
                {mode === 'student'
                  ? 'Pilih makanan/minuman favorit Anda untuk pesan langsung!'
                  : 'Pilih menu di sebelah kiri untuk melayani siswa di kasir.'}
              </p>
            </div>
          ) : (
            cart.map(({ item, qty }) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">
                    Rp {item.price.toLocaleString('id-ID')} x {qty} ={' '}
                    <strong style={{ color: '#fff' }}>
                      Rp {(item.price * qty).toLocaleString('id-ID')}
                    </strong>
                  </div>
                </div>
                <div className="cart-qty-ctrl">
                  <button
                    className="qty-btn"
                    onClick={() => updateQty(item.id, -1)}
                  >
                    -
                  </button>
                  <span className="qty-number">{qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() => updateQty(item.id, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          {/* Catatan Pesanan (Opsional) */}
          {cart.length > 0 && (
            <div className="order-options-box">
              <input
                type="text"
                className="order-note-input"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Catatan pesanan (opsional, cth: jangan pedas, es sedikit)..."
              />
            </div>
          )}

          <div className="cart-summary-row">
            <span className="summary-label">Biaya Transaksi (Zero MDR)</span>
            <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
              Rp 0 (Bebas Biaya)
            </span>
          </div>

          <div className="cart-summary-row">
            <span className="summary-label" style={{ fontWeight: 600 }}>
              Total Pembayaran
            </span>
            <span className="summary-total">
              Rp {totalAmount.toLocaleString('id-ID')}
            </span>
          </div>

          {errorMessage && (
            <div
              style={{
                background: 'rgba(244,63,94,0.15)',
                border: '1px solid #f43f5e',
                color: '#fda4af',
                padding: '0.6rem 0.75rem',
                borderRadius: 10,
                fontSize: '0.8rem'
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Payment Action Buttons */}
          {mode === 'student' ? (
            /* Mode Siswa: Direct Pay is the Primary Action */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="pay-btn-direct"
                disabled={cart.length === 0 || isProcessing}
                onClick={executeDirectPayment}
              >
                <span style={{ fontSize: '1.3rem' }}>⚡</span>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                    {isProcessing ? 'Memproses Transaksi...' : `Bayar Langsung Rp ${totalAmount.toLocaleString('id-ID')}`}
                  </div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 500, marginTop: '2px' }}>
                    Otomatis potong saldo SkanilanPay • Tanpa kartu/scan
                  </div>
                </div>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                <button
                  className="sim-btn"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.72rem', justifyContent: 'center' }}
                  disabled={cart.length === 0}
                  onClick={() => {
                    setErrorMessage('');
                    setIsRfidModalOpen(true);
                  }}
                >
                  💳 Opsi Tap Kartu
                </button>
                <button
                  className="sim-btn"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.72rem', justifyContent: 'center' }}
                  disabled={cart.length === 0}
                  onClick={startQrPayment}
                >
                  📱 Opsi QRIS
                </button>
              </div>
            </div>
          ) : (
            /* Mode Kasir: Traditional POS with RFID, QR, and Direct Student Pay */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="pay-btn-group">
                <button
                  className="pay-btn pay-btn-rfid"
                  disabled={cart.length === 0}
                  onClick={() => {
                    setErrorMessage('');
                    setIsRfidModalOpen(true);
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>💳</span>
                  <span>Tap Kartu RFID</span>
                </button>

                <button
                  className="pay-btn pay-btn-qr"
                  disabled={cart.length === 0}
                  onClick={startQrPayment}
                >
                  <span style={{ fontSize: '1.2rem' }}>📱</span>
                  <span>QRIS Skanilan</span>
                </button>
              </div>

              <button
                className="sim-btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'rgba(139,92,246,0.15)',
                  borderColor: 'rgba(139,92,246,0.4)',
                  color: '#c4b5fd',
                  padding: '0.6rem'
                }}
                disabled={cart.length === 0 || isProcessing}
                onClick={executeDirectPayment}
              >
                <span>⚡ Bayar Langsung Siswa ({studentData?.user?.name || 'Budi'})</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MODAL 1: RFID Tap */}
      {isRfidModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setIsRfidModalOpen(false)}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              💳 Tap Kartu Pintar Pelajar
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Dekatkan kartu siswa SMKN 9 (Mifare Ultralight C) ke USB Reader kasir.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={rfidInput}
                onChange={(e) => setRfidInput(e.target.value)}
                placeholder="UID Kartu (cth: 04A23F89BC1180)"
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  padding: '0.75rem 1rem',
                  color: '#fff',
                  fontFamily: 'monospace'
                }}
              />
              <button
                className="add-btn"
                style={{ padding: '0 1.25rem' }}
                disabled={isProcessing}
                onClick={() => executeRfidPayment(rfidInput)}
              >
                {isProcessing ? 'Memproses...' : 'Kirim'}
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  background: 'rgba(244,63,94,0.15)',
                  border: '1px solid #f43f5e',
                  color: '#fda4af',
                  padding: '0.75rem',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Simulasi Cepat (Demo Tap Kartu):
            </div>
            <div className="sim-btn-row">
              <button
                className="sim-btn"
                onClick={() => executeRfidPayment('04A23F89BC1180')}
              >
                <span>👤 Budi Santoso (XII RPL 1)</span>
                <span style={{ color: '#10b981', fontFamily: 'monospace' }}>
                  Saldo: Rp 155.000
                </span>
              </button>
              <button
                className="sim-btn"
                onClick={() => executeRfidPayment('04B34C90CD2291')}
              >
                <span>👤 Siti Aminah (XII TB 2)</span>
                <span style={{ color: '#10b981', fontFamily: 'monospace' }}>
                  Saldo: Rp 112.000
                </span>
              </button>
              <button
                className="sim-btn"
                style={{ borderColor: 'rgba(244,63,94,0.3)' }}
                onClick={() => executeRfidPayment('04INVALID000000')}
              >
                <span>❌ Kartu Palsu / Tidak Terdaftar</span>
                <span style={{ color: '#f43f5e' }}>Uji Tolak</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Dynamic QRIS */}
      {isQrModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <button
              className="modal-close"
              onClick={() => setIsQrModalOpen(false)}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              📱 Scan QRIS Skanilan
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              Arahkan kamera aplikasi portal siswa untuk membayar tagihan ini.
            </p>

            {qrSession ? (
              <>
                <div className="qr-box">
                  <img src={qrSession.qr_image_data} alt="Dynamic QR Payment" />
                </div>

                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                  Rp {totalAmount.toLocaleString('id-ID')}
                </div>

                <div className="countdown-badge">
                  ⏱️ Kedaluwarsa dalam {Math.floor(qrTimeLeft / 60)}:
                  {(qrTimeLeft % 60).toString().padStart(2, '0')}
                </div>

                {qrPaidStatus && (
                  <div className="success-banner">
                    <h3 style={{ color: '#10b981', fontWeight: 700 }}>
                      🎉 Pembayaran Diterima!
                    </h3>
                    <p style={{ fontSize: '0.85rem' }}>
                      Dibayar oleh {qrPaidStatus.paid_by_name}
                    </p>
                  </div>
                )}

                <div
                  style={{
                    marginTop: '1.5rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                    Simulasi Pembayaran Siswa (Satu Klik):
                  </p>
                  <button
                    className="sim-btn"
                    style={{ width: '100%', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', borderColor: '#10b981', color: '#6ee7b7' }}
                    onClick={simulateStudentScanAndPay}
                    disabled={isProcessing || qrPaidStatus}
                  >
                    {isProcessing ? 'Memproses...' : `✨ Bayar Sekarang (Atas Nama ${studentData?.user?.name || 'Budi'})`}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '3rem 0', color: '#9ca3af' }}>
                {errorMessage ? (
                  <span style={{ color: '#f43f5e' }}>⚠️ {errorMessage}</span>
                ) : (
                  'Membuat QR Dinamis via SDK...'
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Cashier Receipt View */}
      {isReceiptModalOpen && lastReceipt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                  fontSize: '1.8rem'
                }}
              >
                ✅
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                Transaksi Sukses!
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                {lastReceipt.merchant?.name || MERCHANT_NAME}
              </p>
            </div>

            <div className="receipt-card">
              <div className="receipt-row">
                <span style={{ color: '#9ca3af' }}>No. Referensi:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>
                  {lastReceipt.reference_no}
                </span>
              </div>
              <div className="receipt-row">
                <span style={{ color: '#9ca3af' }}>Metode Bayar:</span>
                <span style={{ color: '#93c5fd' }}>
                  {lastReceipt.payment_method || lastReceipt.method}
                </span>
              </div>
              <div className="receipt-row">
                <span style={{ color: '#9ca3af' }}>Pembeli:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>
                  {lastReceipt.student?.name} ({lastReceipt.student?.kelas})
                </span>
              </div>
              <div className="receipt-row">
                <span style={{ color: '#9ca3af' }}>Waktu:</span>
                <span>{new Date(lastReceipt.timestamp).toLocaleTimeString('id-ID')}</span>
              </div>

              <div
                style={{
                  borderTop: '1px dashed rgba(255,255,255,0.15)',
                  margin: '0.75rem 0',
                  paddingTop: '0.75rem'
                }}
              >
                {lastReceipt.items?.map((ci: any, idx: number) => (
                  <div key={idx} className="receipt-row">
                    <span>
                      {ci.qty || ci.item?.qty}x {ci.name || ci.item?.name}
                    </span>
                    <span>
                      Rp {((ci.price || ci.item?.price) * (ci.qty || ci.item?.qty || 1)).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.2)',
                  paddingTop: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                <div className="receipt-row" style={{ fontSize: '1rem', fontWeight: 800 }}>
                  <span style={{ color: '#fff' }}>TOTAL:</span>
                  <span style={{ color: '#10b981' }}>
                    Rp {lastReceipt.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                {lastReceipt.wallet?.balance_after !== undefined && (
                  <div className="receipt-row" style={{ marginTop: '0.4rem', color: '#9ca3af' }}>
                    <span>Sisa Saldo Siswa:</span>
                    <span style={{ color: '#6ee7b7' }}>
                      Rp {lastReceipt.wallet.balance_after.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              className="pay-btn pay-btn-qr"
              style={{ width: '100%' }}
              onClick={() => setIsReceiptModalOpen(false)}
            >
              Transaksi Baru ➔
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: DIGITAL ORDER TICKET (Tiket Antrean Pesanan Mandiri Siswa) */}
      {isOrderTicketModalOpen && orderTicketResult && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <button
              className="modal-close"
              onClick={() => setIsOrderTicketModalOpen(false)}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.2rem' }}>🎉</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Pesanan Berhasil Dibayar!
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                {orderTicketResult.merchant?.name || MERCHANT_NAME} (Stand #01)
              </p>
            </div>

            <div className="order-ticket-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#a78bfa', fontWeight: 700 }}>
                  TIKET ANTREAN PESANAN
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {orderTicketResult.reference_no}
                </span>
              </div>

              <div className="ticket-number-display">
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                  NOMOR ANTREAN ANDA
                </div>
                <div className="ticket-number">
                  {orderTicketResult.order_ticket_no}
                </div>
                <div className="ticket-status-pulse">
                  <span className="pulse-dot"></span>
                  <span>Pesanan Diterima Dapur • Siap ~5 Menit</span>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderBottom: '1px dashed rgba(255,255,255,0.15)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Pemesan:</span>
                  <strong style={{ color: '#fff' }}>{orderTicketResult.student?.name} ({orderTicketResult.student?.kelas || 'XII RPL 1'})</strong>
                </div>
                {orderTicketResult.notes && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Catatan:</span>
                    <span style={{ color: '#fde047', fontStyle: 'italic' }}>"{orderTicketResult.notes}"</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Metode Bayar:</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>⚡ SkanilanPay Direct</span>
                </div>
              </div>

              {/* Items List */}
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                {orderTicketResult.items?.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.qty}x {item.name}</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              {/* Total & Wallet Info */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800 }}>
                  <span>Total Bayar:</span>
                  <span style={{ color: '#34d399' }}>Rp {orderTicketResult.amount.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                  <span>Sisa Saldo SkanilanPay:</span>
                  <span style={{ color: '#6ee7b7', fontFamily: 'monospace', fontWeight: 600 }}>
                    Rp {(orderTicketResult.wallet?.balance_after || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  <span>Sisa Kuota Jajan Hari Ini:</span>
                  <span style={{ color: '#93c5fd', fontFamily: 'monospace' }}>
                    Rp {(orderTicketResult.wallet?.remaining_daily_quota || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: '0.75rem', marginTop: '1rem', fontSize: '0.78rem', color: '#93c5fd', textAlign: 'center' }}>
              📢 <strong>Tips:</strong> Silakan tunggu di kantin atau kelas. Cukup tunjukkan nomor antrean <strong>{orderTicketResult.order_ticket_no}</strong> saat dipanggil oleh Bu Sri.
            </div>

            <button
              className="pay-btn-direct"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setIsOrderTicketModalOpen(false)}
            >
              Selesai / Pesan Menu Baru ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
