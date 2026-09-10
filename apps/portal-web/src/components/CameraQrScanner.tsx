import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export interface ScannedQrResult {
  isStatic: boolean;
  sessionId?: string;
  merchantCode?: string;
  merchantName?: string;
  amount?: number;
  rawText: string;
}

interface CameraQrScannerProps {
  onScanSuccess: (data: ScannedQrResult) => void;
  onClose: () => void;
}

export const CameraQrScanner: React.FC<CameraQrScannerProps> = ({ onScanSuccess, onClose }) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processQrText = (decodedText: string) => {
    try {
      const parsed = JSON.parse(decodedText);

      // Model A: Static QR Meja Merchant (Kantin konvensional tanpa POS)
      if (parsed.type === 'static_qr_merchant' || (parsed.merchant_code && !parsed.session_id)) {
        onScanSuccess({
          isStatic: true,
          merchantCode: parsed.merchant_code,
          merchantName: parsed.merchant_name || 'Kantin Sekolah',
          rawText: decodedText
        });
        return;
      }

      // Model B: Dynamic QR Kasir POS (dengan nominal pas & batas 3 menit)
      if (parsed.session_id) {
        onScanSuccess({
          isStatic: false,
          sessionId: parsed.session_id,
          merchantCode: parsed.merchant_code,
          merchantName: parsed.merchant_name,
          amount: parsed.amount,
          rawText: decodedText
        });
        return;
      }
    } catch {
      // Jika teks biasa
      if (decodedText.startsWith('QR-') || decodedText.length > 5) {
        onScanSuccess({
          isStatic: false,
          sessionId: decodedText,
          rawText: decodedText
        });
        return;
      }
    }

    // Default fallback ke static jika mengenali format kode merchant
    if (decodedText.startsWith('KNT-')) {
      onScanSuccess({
        isStatic: true,
        merchantCode: decodedText,
        merchantName: 'Kantin Mbak Sri',
        rawText: decodedText
      });
      return;
    }

    onScanSuccess({
      isStatic: false,
      sessionId: decodedText,
      rawText: decodedText
    });
  };

  useEffect(() => {
    const html5QrCode = new Html5Qrcode('qr-reader-viewport');
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            processQrText(decodedText);
          },
          () => {}
        );
        setIsCameraActive(true);
      } catch (err: any) {
        console.warn('Gagal membuka kamera:', err);
        setCameraError(
          'Kamera tidak aktif atau izin ditolak. Gunakan opsi upload gambar atau tombol simulasi di bawah.'
        );
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    try {
      const decodedText = await scannerRef.current.scanFile(file, true);
      processQrText(decodedText);
    } catch {
      setCameraError('Gambar tidak memuat QR Code yang valid.');
    }
  };

  // Helper Demo: Simulasi Scan Dynamic QR Kasir
  const handleQuickPickDynamicBill = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_code: 'KNT-U01',
          amount: 15000,
          description: 'Nasi Ayam Geprek Kantin Mbak Sri'
        })
      });
      const data = await res.json();
      if (data.success) {
        processQrText(
          JSON.stringify({
            session_id: data.data.session_id,
            merchant_name: data.data.merchant.name,
            amount: data.data.amount
          })
        );
      }
    } catch {
      setCameraError('Gagal mengambil tagihan dinamis simulasi.');
    }
  };

  // Helper Demo: Simulasi Scan Static QR Meja Kantin
  const handleQuickPickStaticQr = () => {
    processQrText(
      JSON.stringify({
        app: 'myskanilan',
        type: 'static_qr_merchant',
        merchant_code: 'KNT-U01',
        merchant_name: 'Kantin Mbak Sri (Stand #01)'
      })
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
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
          background: '#0b0f19',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 24,
          padding: '1.75rem',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#fff',
            width: 32,
            height: 32,
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ✕
        </button>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem', color: '#fff' }}>
          📷 Pemindai Kamera QRIS Skanilan
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
          Arahkan ke <strong>Dynamic QR Kasir</strong> atau <strong>Static QR Meja Kantin</strong>.
        </p>

        {/* Viewport Kamera Interaktif */}
        <div className="camera-scanner-container">
          <div id="qr-reader-viewport"></div>
          {isCameraActive && (
            <>
              <div className="camera-laser"></div>
              <div className="scanner-viewfinder-box"></div>
            </>
          )}
        </div>

        {cameraError && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              padding: '0.75rem',
              borderRadius: 12,
              fontSize: '0.8rem',
              margin: '0.75rem 0'
            }}
          >
            ℹ️ {cameraError}
          </div>
        )}

        {/* Action Controls & Fallback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          <button
            className="portal-action-btn"
            style={{ background: 'rgba(255, 255, 255, 0.06)', fontSize: '0.8rem', width: '100%' }}
            onClick={() => fileInputRef.current?.click()}
          >
            📁 Unggah Screenshot / File QR
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              className="portal-action-btn"
              style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981', color: '#6ee7b7', fontSize: '0.75rem' }}
              onClick={handleQuickPickStaticQr}
            >
              🏷️ Demo Static QR Meja
            </button>
            <button
              className="portal-action-btn"
              style={{ background: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1', color: '#a5b4fc', fontSize: '0.75rem' }}
              onClick={handleQuickPickDynamicBill}
            >
              ⚡ Demo Dynamic POS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
