# MySkanilan — Ekosistem Digital Terintegrasi SMKN 9 Semarang

> **Dikembangkan untuk Lomba JHIC** · Laravel 13 API · React Frontend · Monorepo

[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![PHP](https://img.shields.io/badge/PHP-8.3+-777BB4?logo=php)](https://php.net)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Filosofi Sistem](#2-filosofi-sistem)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Stack Teknologi](#4-stack-teknologi)
5. [Struktur Monorepo](#5-struktur-monorepo)
6. [Modul & Fitur](#6-modul--fitur)
7. [Bank Sekolah — Sistem Keuangan Digital](#7-bank-sekolah--sistem-keuangan-digital)
8. [RFID Card — Data & Protokol](#8-rfid-card--data--protokol)
9. [Sistem Keamanan Berlapis](#9-sistem-keamanan-berlapis)
10. [Alur Integrasi Antar-Modul](#10-alur-integrasi-antar-modul)
11. [Alur Ekonomi Sirkular](#11-alur-ekonomi-sirkular)
12. [Roadmap Pengembangan](#12-roadmap-pengembangan)
13. [Setup & Instalasi](#13-setup--instalasi)
14. [Environment Variables](#14-environment-variables)
15. [Konvensi Kode](#15-konvensi-kode)

---

## 1. Gambaran Umum

**MySkanilan** adalah portal identitas digital SMKN 9 Semarang yang menyatukan **7 platform** ke dalam satu ekosistem terintegrasi. Bukan sekadar website profil sekolah — melainkan tulang punggung ekonomi & kepedulian sosial warga sekolah yang benar-benar berjalan.

```
Satu kartu RFID → Satu akun → Tujuh platform → Satu ekosistem ekonomi sirkular tertutup
```

### Tujuh Platform

| # | Platform | Kompleksitas | Fungsi Utama |
|---|----------|:---:|---|
| 1 | **Marketplace Sekolah** | 🔴 Tinggi | Jual-beli produk siswa, bayar via saldo RFID |
| 2 | **ThalassemiaGo** | 🟡 Sedang | Donor darah, kemitraan RS Kariadi |
| 3 | **Skanilan Tech** | 🔴 Tinggi | Unit produksi IoT, RFID presensi |
| 4 | **LMS Pembelajaran** | 🟡 Sedang | Materi, kuis, tugas, nilai |
| 5 | **AI Chatbot** | 🔴 Tinggi | Asisten AI seluruh ekosistem |
| 6 | **Perpustakaan Online** | 🟡 Sedang | Katalog buku, e-book digital |
| 7 | **Bank Sekolah + Cashless RFID** | 🔴 Tinggi | Dompet digital, kartu presensi & bayar |

---

## 2. Filosofi Sistem

### Ekonomi Tertutup — Bukan Sekadar Fitur

Keputusan terbesar dalam MySkanilan: **tidak menggunakan payment gateway eksternal (QRIS/Midtrans) sebagai metode bayar utama.** Seluruh transaksi ekonomi warga sekolah — kantin, marketplace, koperasi — berjalan di atas **satu sistem keuangan digital internal** yang dikelola Bank Sekolah.

| Aspek | Sistem Konvensional | MySkanilan |
|---|---|---|
| Bayar kantin | Tunai / QRIS | Tap kartu RFID |
| Bayar marketplace | Transfer / QRIS | Saldo digital internal |
| Uang beredar | Keluar ke bank eksternal | Tetap di ekosistem sekolah |
| Data transaksi | Di penyedia payment | 100% milik sekolah |
| Biaya transaksi | MDR 0.3–0.7% per transaksi | Rp 0 |
| Literasi keuangan | Tidak termonitor | Dashboard real-time per siswa |

### Prinsip Desain

1. **Kartu = Identitas, bukan penyimpan data** — saldo & data ada di server, bukan di chip.
2. **Uang tidak pernah hilang** — setiap sen harus bisa direkonsiliasi; transaksi bersifat *append-only*.
3. **Defense in depth** — keamanan berlapis: hardware, jaringan, aplikasi, database, audit.
4. **Zero trust pada device** — perangkat RFID di kantin/kelas diperlakukan sebagai *untrusted client* yang harus otentikasi setiap request.
5. **Transparansi penuh** — siswa, orang tua, dan admin bisa melihat riwayat transaksi kapan saja.

---

## 3. Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (SPA)                          │
│         Vite · React 19 · TanStack Query · Zustand               │
│  Portal Siswa │ Dashboard Guru │ POS Kantin │ Admin Bank Sekolah  │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS / JSON:API
┌──────────────────────▼───────────────────────────────────────────┐
│                   LARAVEL 13 API                                  │
│                                                                  │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │  Core/  │  │   Bank    │  │  Market  │  │      LMS        │  │
│  │   SSO   │  │  Sekolah  │  │  place   │  │                 │  │
│  └─────────┘  └───────────┘  └──────────┘  └─────────────────┘  │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │Skanilan │  │  Cashless │  │ Chatbot  │  │    Library      │  │
│  │  Tech   │  │   RFID    │  │  (AI)    │  │                 │  │
│  └─────────┘  └───────────┘  └──────────┘  └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Thalassemia                                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Passport (OAuth2) · Reverb (WebSocket) · Horizon (Queue)        │
│  Laravel AI SDK · Spatie Permission · Activity Log               │
└──────┬────────────────────────────────────────┬──────────────────┘
       │                                        │
┌──────▼──────────┐                    ┌────────▼──────────────┐
│  MySQL 8.0+     │                    │  External Services    │
│  Redis 7+       │                    │  RS Kariadi (webhook) │
│  (Cache/Queue/  │                    │  SMTP (notifikasi)    │
│   Session)      │                    │  Google Gemini AI     │
└─────────────────┘                    └───────────────────────┘
                                                ▲
                                    ┌───────────┴───────────┐
                                    │    RFID Device Layer   │
                                    │  Kelas · Kantin · POS  │
                                    │  (device token + HMAC) │
                                    └───────────────────────┘
```

### Keputusan Arsitektur

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Pola backend | Modular Monolith | Tim kecil, 1 deploy, integrasi antar-modul mudah via event |
| Auth user | Laravel Passport (OAuth2) | SSO multi-client: SPA, RFID device, mobile |
| Auth device RFID | Device token + HMAC-SHA256 | Setiap perangkat punya kredensial unik, bukan shared secret |
| API spec | JSON:API (Laravel 13 native) | Standar, filter/sort/include konsisten |
| Realtime | Laravel Reverb (DB driver) | Notifikasi live transaksi, tanpa Redis wajib |
| Keuangan | Internal ledger (MySQL transactions) | Zero MDR, data milik sekolah, audit penuh |
| Saldo | Server-side only | Tidak ada saldo di chip kartu → tidak bisa dimanipulasi offline |
| AI | Laravel AI SDK + Gemini | Chatbot RAG, terhubung ke semua modul |
| Module pattern | `nwidart/laravel-modules` | Isolasi kode, tetap 1 codebase & 1 deploy |

---

## 4. Stack Teknologi

### Backend — Laravel 13

| Package | Versi | Fungsi |
|---|---|---|
| `laravel/framework` | ^13.0 | Core — PHP 8.3+, JSON:API native |
| `laravel/passport` | ^13.0 | OAuth2 SSO untuk user & device |
| `laravel/reverb` | ^2.0 | WebSocket (DB driver, no Redis required) |
| `laravel/horizon` | ^5.0 | Queue worker + dashboard |
| `laravel/ai` | ^1.0 | AI SDK (Gemini/OpenAI) — stable di L13 |
| `nwidart/laravel-modules` | ^11.0 | Modular structure |
| `spatie/laravel-permission` | ^6.0 | RBAC: role & permission per modul |
| `spatie/laravel-activitylog` | ^4.0 | Audit trail — siapa melakukan apa kapan |
| `spatie/laravel-media-library` | ^11.0 | Upload gambar produk, e-book, foto profil |
| `spatie/laravel-query-builder` | ^6.0 | Filter/sort/include di semua list endpoint |
| `spatie/laravel-data` | ^4.0 | Typed DTO untuk validasi & transformasi data |

### Frontend — React 19

| Package | Versi | Fungsi |
|---|---|---|
| `react` | ^19.0 | UI framework |
| `vite` | ^6.0 | Build tool |
| `@tanstack/react-query` | ^5.0 | Server state, cache, background refetch |
| `react-router-dom` | ^7.0 | Client-side routing + nested layouts |
| `axios` | ^1.7 | HTTP client — interceptor untuk token refresh |
| `zustand` | ^5.0 | Client state: auth token, cart, UI state |
| `tailwindcss` | ^4.0 | Styling utility-first |
| `shadcn/ui` | latest | Accessible component library |
| `react-hot-toast` | ^2.0 | Notifikasi transaksi real-time |
| `recharts` | ^2.0 | Dashboard grafik keuangan & statistik |

### Infrastructure

| Layanan | Stack | Catatan |
|---|---|---|
| Runtime | PHP 8.3+, Node.js 22+ | |
| Database | MySQL 8.0+ | InnoDB — wajib untuk ACID transactions |
| Cache & Queue | Redis 7+ | Session, queue, rate limiting |
| WebSocket | Laravel Reverb (DB driver) | |
| AI | Google Gemini 2.0 Flash | Via Laravel AI SDK |
| Storage | Local → S3-compatible (prod) | File produk, e-book, foto |
| RFID Hardware | Mifare Ultralight / Classic 1K | ISO 14443A |

---

## 5. Struktur Monorepo

```
jhic-smkn9smg/   ← nama repo (nama lomba)
│
├── README.md
├── .gitignore
│
├── backend/                           ← Laravel 13 API
│   ├── Modules/
│   │   ├── Core/                      ← Auth, User, SSO, Notification
│   │   ├── BankSekolah/               ← Ledger, TopUp, Settlement
│   │   ├── Cashless/                  ← RFID Card, Wallet, POS Transaksi
│   │   ├── Marketplace/               ← Produk, Order, Pembayaran internal
│   │   ├── Skanilan/                  ← Unit Produksi, RFID Presensi
│   │   ├── LMS/                       ← Kursus, Kuis, Tugas, Nilai
│   │   ├── Library/                   ← Buku, E-book, Peminjaman
│   │   ├── Chatbot/                   ← AI Layer, Knowledge Base, Session
│   │   └── Thalassemia/               ← Embed, Donor, Notifikasi Darah
│   │
│   ├── app/
│   │   ├── Http/Middleware/           ← DeviceAuth, RoleCheck, AuditLog
│   │   ├── Services/                  ← LedgerService, NotificationService
│   │   ├── Events/                    ← CrossModuleEvents
│   │   └── Listeners/
│   │
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php                    ← aggregator semua modul
│   │   └── device.php                 ← endpoint khusus RFID device
│   └── tests/
│       ├── Feature/
│       └── Unit/
│
└── frontend/                          ← React 19 SPA
    └── src/
        ├── features/                  ← 1 folder per modul
        │   ├── auth/
        │   ├── bank/                  ← Bank Sekolah dashboard
        │   ├── cashless/              ← Saldo, riwayat transaksi
        │   ├── pos/                   ← Antarmuka kasir kantin
        │   ├── marketplace/
        │   ├── lms/
        │   ├── library/
        │   ├── chatbot/
        │   └── thalassemia/
        ├── components/
        │   ├── ui/                    ← shadcn components
        │   └── shared/                ← Navbar, Sidebar, TransactionToast
        ├── api/                       ← axios instances per modul
        ├── store/                     ← zustand stores
        ├── hooks/
        └── router/
```

---

## 6. Modul & Fitur

### 6.1 Core / SSO

Fondasi seluruh sistem — harus selesai sebelum modul lain.

- **OAuth2 via Laravel Passport** — issue token untuk: React SPA, perangkat RFID, app mobile (future)
- **Role-based access** via `spatie/laravel-permission` — permission per modul, bukan per route satu-satu
- **User management** — siswa, guru, admin, operator kantin, orang tua
- **SSO token lifecycle** — access token 15 menit, refresh token 7 hari, auto-rotate

**Role hierarchy:**
```
super_admin     → kelola seluruh sistem + konfigurasi Bank Sekolah
admin           → semua fitur non-keuangan + dashboard statistik
bank_operator   → topup, settlement, freeze akun, laporan keuangan
guru            → LMS admin, Library, lihat presensi kelas
kasir_kantin    → POS transaksi kantin
siswa           → LMS, Marketplace, Library, Cashless, Chatbot
orang_tua       → lihat nilai anak, riwayat transaksi anak (read-only)
tamu            → Portal publik, Chatbot, profil sekolah
```

---

### 6.2 Bank Sekolah + Cashless RFID 🔴

> **Ini adalah inti ekosistem.** Dibahas lebih dalam di [Bagian 7](#7-bank-sekolah--sistem-keuangan-digital).

Ringkasan fungsi:
- Siswa setor tunai di counter Bank Sekolah → saldo dikreditkan ke akun
- Kartu RFID digunakan untuk tap-bayar di **kantin, marketplace, koperasi**
- Saldo hanya ada di server — kartu hanya sebagai kunci identitas
- Orang tua bisa set batas pengeluaran harian anak
- Laporan transaksi real-time ke siswa, orang tua, dan admin

---

### 6.3 Marketplace Sekolah 🔴

- Listing produk buatan siswa: fashion, pangan, IoT, aplikasi
- **Bayar via saldo RFID** — tidak ada payment gateway eksternal
- Stok auto-sync dari Modul Skanilan (event-driven)
- Seller = siswa/unit produksi; buyer = siapa saja dalam ekosistem
- Order lifecycle: `pending → confirmed → processing → ready → done`
- Revenue penjual langsung dikreditkan ke saldo mereka

---

### 6.4 Skanilan Tech 🔴

- Manajemen **unit produksi** per jurusan (RPL, Elektronika, Mekatronika, Kuliner, Fashion)
- **RFID presensi**: perangkat di pintu kelas scan kartu → log absen → broadcast ke LMS
- Produk buatan siswa: daftar ke Marketplace dengan 1 klik, langsung sinkron stok
- Dashboard produksi: target vs realisasi bulanan, revenue per unit

---

### 6.5 LMS Pembelajaran 🟡

- **Kursus** per mapel/kompetensi, enroll siswa manual atau otomatis dari jadwal
- **Lesson**: teks, video embed, file — bisa referensi e-book dari Library
- **Kuis**: timer countdown, auto-grade, analitik per soal
- **Tugas**: upload file, guru beri nilai + feedback teks
- Notifikasi deadline tugas & nilai keluar → dikirim via AI Chatbot dan realtime toast

---

### 6.6 AI Chatbot 🔴

- Powered by **Laravel AI SDK** + Gemini 2.0 Flash
- **RAG (Retrieval-Augmented Generation)**: jawaban berdasarkan data nyata dari sistem
- Knowledge sources: materi LMS, katalog Library, info sekolah, stok Marketplace, jadwal
- Fungsi: titik masuk tunggal — arahkan user ke fitur yang mereka butuhkan
- Chatbot bisa cek saldo, lihat riwayat transaksi, info ketersediaan buku, nilai siswa
- Session tersimpan per user (login) / per browser token (tamu)

---

### 6.7 Perpustakaan Online 🟡

- Katalog buku fisik + e-book digital dengan pencarian full-text
- **Peminjaman buku**: cek stok real-time, batas tanggal kembali, reminder H-1 via notifikasi
- **E-book**: baca online (PDF viewer embed), bukan download bebas
- Referensi dari LMS lesson langsung ke e-book spesifik (deeplink)
- Chatbot bisa menjawab ketersediaan buku secara natural

---

### 6.8 ThalassemiaGo 🟡

- **Embed** portal `thalassemiago.my.id` via iframe + tombol deeplink
- **Widget homepage**: kebutuhan darah mendesak dari RS Dr. Kariadi (polling/webhook)
- Pendaftaran donor tetap: SSO opsional, riwayat donor tersimpan di profil user
- Nilai sosial ini jadi "modal reputasi" sekolah di mata juri & masyarakat

---

## 7. Bank Sekolah — Sistem Keuangan Digital

### 7.1 Konsep: Closed-Loop Financial System

MySkanilan mengoperasikan sistem keuangan **tertutup** (closed-loop). Tidak ada integrasi ke payment gateway eksternal untuk transaksi sehari-hari. Uang masuk via topup tunai, dan berputar di dalam ekosistem sekolah.

```
[Uang Tunai Siswa]
       │
       ▼ Setor di counter
[Bank Sekolah Counter]
       │ Admin input + konfirmasi
       ▼
[Virtual Account Siswa] ← saldo digital di server
       │
       ├──→ [Kantin RFID POS]      tap kartu bayar makan
       ├──→ [Marketplace Sekolah]  beli produk siswa lain
       ├──→ [Koperasi Sekolah]     beli ATK, kebutuhan sekolah
       └──→ [Pembayaran Lain]      kegiatan OSIS, dll (future)
                │
                ▼
      [Merchant Account] ← saldo terkumpul di akun merchant
                │
                ▼ Settlement harian
      [Rekening Sekolah / Kas] ← rekonsiliasi ke dunia nyata
```

### 7.2 Alur Topup (Setor Saldo)

```
1. Siswa datang ke counter Bank Sekolah bawa uang tunai
2. Operator scan kartu RFID siswa → sistem identifikasi akun
3. Operator input nominal topup
4. Sistem tampilkan konfirmasi: "Topup Rp 100.000 untuk [Nama Siswa]?"
5. Operator konfirmasi dengan PIN operator (bukan password biasa)
6. Sistem eksekusi:
   a. INSERT wallet_transactions (type: topup, status: pending)
   b. Verifikasi tidak ada transaksi duplikat (idempotency check)
   c. UPDATE rfid_accounts SET balance = balance + amount (atomic)
   d. UPDATE wallet_transactions SET status = 'completed'
   e. Broadcast notifikasi realtime ke siswa
7. Struk digital dikirim ke app siswa & orang tua
8. Uang fisik masuk kas Bank Sekolah
```

**Batasan topup:**
- Minimum topup: Rp 10.000
- Maximum topup per transaksi: Rp 500.000
- Maximum topup per hari: Rp 1.000.000
- Topup hanya bisa dilakukan oleh `bank_operator` yang terautentikasi

### 7.3 Alur Pembayaran (Tap & Pay)

```
1. Siswa tap kartu di reader RFID (kantin/marketplace/koperasi)
2. RFID reader kirim ke API:
   POST /api/device/pay
   {
     card_uid: "04:AB:CD:EF:12:34:56",
     merchant_id: "kantin-utara-01",
     amount: 15000,
     items: [...],
     nonce: "<random-32-bytes>",       ← anti-replay
     timestamp: 1723510000,
     signature: "HMAC-SHA256(...)"    ← device signature
   }
3. Server validasi:
   a. Verifikasi device signature (HMAC-SHA256 dengan device_secret)
   b. Cek nonce belum pernah dipakai (Redis TTL 5 menit)
   c. Cek timestamp tidak lebih dari ±60 detik
   d. Cek batas pengeluaran harian siswa
   e. Cek saldo cukup
4. Eksekusi atomic dalam MySQL transaction:
   a. SELECT balance FOR UPDATE (row-level lock)
   b. Validasi balance >= amount
   c. INSERT wallet_transactions (type: payment, status: pending)
   d. UPDATE rfid_accounts SET balance = balance - amount
   e. UPDATE merchant_accounts SET balance = balance + amount
   f. UPDATE wallet_transactions SET status = 'completed'
5. RFID reader terima respons dalam <500ms
6. Layar POS tampilkan: "APPROVED — Sisa saldo: Rp XX.XXX"
7. Notifikasi realtime ke app siswa & orang tua
```

### 7.4 Merchant System

Setiap titik pembayaran (kantin, koperasi, marketplace) punya akun merchant:

| Merchant | Tipe | Settlement |
|---|---|---|
| Kantin Utara | `pos_merchant` | Harian (setiap pukul 22:00) |
| Kantin Selatan | `pos_merchant` | Harian |
| Koperasi Sekolah | `pos_merchant` | Harian |
| Marketplace | `platform_merchant` | Real-time ke seller + fee platform |
| OSIS | `event_merchant` | Per event |

**Settlement harian:**
- Otomatis via scheduled job (`php artisan bank:settle`)
- Total saldo merchant ditransfer ke rekening kas sekolah (pencatatan digital)
- Laporan PDF digenerate otomatis, bisa di-download admin

### 7.5 Laporan & Rekonsiliasi

- **Dashboard Bank Sekolah**: total saldo beredar, volume transaksi hari ini, top spender
- **Laporan per siswa**: riwayat lengkap topup & pengeluaran, bisa difilter per periode
- **Laporan merchant**: pendapatan harian/bulanan per merchant
- **Rekonsiliasi**: total `SUM(rfid_accounts.balance)` + `SUM(merchant_accounts.balance)` harus selalu = total uang yang masuk via topup
- **Alert otomatis**: jika rekonsiliasi tidak balance → notifikasi ke super_admin

### 7.6 Freeze & Refund

```
Freeze akun (kartu hilang/dicuri):
  POST /api/v1/bank/cards/{id}/freeze
  → status kartu jadi 'frozen'
  → semua transaksi ditolak
  → notifikasi ke siswa & orang tua

Unfreeze (kartu baru diterima):
  POST /api/v1/bank/cards/{id}/unfreeze
  → kartu lama di-deactivate permanen
  → saldo dipindah ke kartu baru otomatis
  → log perpindahan kartu tersimpan

Refund (pembayaran salah):
  → Hanya super_admin atau bank_operator yang bisa
  → Wajib ada reason + bukti
  → Reverse transaction tercatat di audit log
  → Tidak bisa hapus transaksi — hanya bisa tambah reverse entry
```

---

## 8. RFID Card — Data & Protokol

### 8.1 Hardware yang Direkomendasikan

| Spesifikasi | Rekomendasi |
|---|---|
| Standar | ISO 14443A |
| Tipe chip | Mifare Ultralight C (anti-clone lebih baik dari Classic 1K) |
| UID | 7 bytes, factory-set, tidak bisa diubah |
| Memory | 48 bytes (kita hanya butuh UID) |
| Range baca | 3–5 cm (NFC short range — by design) |

### 8.2 Apa yang Tersimpan di Kartu?

**Jawaban: Hanya UID (8 hex bytes). Tidak ada yang lain.**

```
Kartu RFID ≠ penyimpan data
Kartu RFID = kunci fisik yang menunjuk ke record di database

UID kartu: 04:AB:CD:EF:12:34:56
                │
                ▼ lookup di server
         rfid_cards.card_number = "04ABCDEF123456"
                │
                ▼
         rfid_accounts.user_id = 1234
         rfid_accounts.balance = 85000
         users.name = "Budi Santoso"
         users.role = "siswa"
```

**Tidak tersimpan di kartu:**
- ❌ Nama siswa
- ❌ NISN
- ❌ Saldo
- ❌ Riwayat transaksi
- ❌ Password / PIN
- ❌ Data pribadi apapun

**Mengapa ini penting?**
Jika kartu hilang atau dicuri, penyerang hanya mendapat UID — sebuah angka hex yang tidak berguna tanpa akses ke server. Kartu langsung bisa di-freeze dari mana saja.

### 8.3 Anti-Clone Protection

Mifare Ultralight C memiliki mekanisme **3DES mutual authentication**. Kita manfaatkan ini:

```
Reader ←→ Kartu: 3DES auth dengan sector key (disimpan aman di reader)
          │
          ▼ Jika auth gagal → kartu dianggap palsu → tolak transaksi
          │
Reader → Server: kirim UID + HMAC signature
          │
Server: verifikasi HMAC → identifikasi device → proses transaksi
```

**Perlindungan tambahan:**
- UID sudah terbaca sejak chip keluar pabrik (tidak bisa diubah pada Ultralight)
- Server menyimpan whitelist UID yang terdaftar — UID tidak dikenal = tolak otomatis
- Setiap kartu punya `enrollment_signature` — hash dari (UID + secret + enrollment_date) — disimpan di server dan diverifikasi saat transaksi besar

### 8.4 Protokol Komunikasi Device → Server

```
POST /api/device/pay (atau /api/device/checkin)
Headers:
  X-Device-ID: kantin-utara-01
  X-Device-Signature: HMAC-SHA256(device_secret, "kantin-utara-01" + body_hash + timestamp)
  X-Timestamp: 1723510000
  Content-Type: application/json

Body:
{
  "card_uid": "04ABCDEF123456",
  "amount": 15000,
  "merchant_id": "kantin-utara-01",
  "nonce": "a3f9b2c1d8e4...",        ← 32 random bytes, single-use
  "timestamp": 1723510000,
  "items": [
    { "name": "Nasi Ayam", "qty": 1, "price": 15000 }
  ]
}
```

**Validasi di server (berurutan, semua harus lulus):**
1. Device ID ada di whitelist
2. HMAC signature valid (gunakan `hash_equals` — constant-time comparison)
3. Timestamp dalam rentang ±60 detik dari server time
4. Nonce belum pernah dipakai (cek Redis, TTL 5 menit)
5. Card UID terdaftar dan tidak frozen
6. Saldo mencukupi
7. Tidak melebihi batas pengeluaran harian

---

## 9. Sistem Keamanan Berlapis

Sistem ini mengelola uang nyata warga sekolah. Keamanan bukan pilihan — itu kewajiban.

### Layer 1 — Jaringan & Transport

| Kontrol | Detail |
|---|---|
| **TLS 1.3** | Semua komunikasi terenkripsi, HTTP di-redirect ke HTTPS |
| **HSTS** | `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| **CORS** | Whitelist ketat: hanya origin yang dikenal (domain sekolah + IP device RFID) |
| **Rate Limiting** | Per-endpoint: login 5x/mnt, API 60x/mnt per user, device 120x/mnt |
| **IP Whitelist (device)** | Perangkat RFID harus dari IP/subnet yang terdaftar |

### Layer 2 — Autentikasi

| Kontrol | Detail |
|---|---|
| **OAuth2 Passport** | Access token: 15 menit. Refresh token: 7 hari, rotasi setiap use |
| **Device token** | Token unik per perangkat, bisa dicabut kapan saja |
| **Brute force** | Lockout 15 menit setelah 5 gagal login; exponential backoff |
| **Session** | Driver Redis, TTL dikontrol server; invalidasi on logout di semua device |
| **Operator PIN** | Topup & freeze wajib input PIN 6 digit terpisah dari password akun |
| **Password hashing** | `bcrypt` cost 12 (Laravel default) |

### Layer 3 — Otorisasi

| Kontrol | Detail |
|---|---|
| **RBAC** | `spatie/laravel-permission` — setiap route dilindungi middleware permission |
| **Policy** | Laravel Policy untuk akses resource level (siswa hanya bisa lihat data sendiri) |
| **Scope token** | OAuth2 scope per client (device RFID hanya bisa akses endpoint `/api/device/*`) |
| **Principle of least privilege** | Setiap role hanya dapat permission minimum yang dibutuhkan |

### Layer 4 — Validasi Input

| Kontrol | Detail |
|---|---|
| **FormRequest** | Semua input divalidasi di FormRequest, bukan di controller |
| **Strict typing** | PHP 8.3 `declare(strict_types=1)` di semua file |
| **Spatie Data** | DTO typed untuk transformasi data masuk dan keluar |
| **File upload** | Validasi MIME type (bukan hanya ekstensi), max size, scan nama file |
| **SQL Injection** | Eloquent ORM only — raw query dilarang keras di semua modul |
| **Mass assignment** | Semua model wajib definisi `$fillable` atau `$guarded = ['*']` |

### Layer 5 — Keamanan Transaksi Keuangan

| Kontrol | Detail |
|---|---|
| **Atomicity** | Semua transaksi keuangan dalam `DB::transaction()` — all or nothing |
| **Row-level lock** | `SELECT ... FOR UPDATE` pada saldo sebelum deduct |
| **Idempotency** | Setiap request transaksi punya nonce — server tolak duplikat |
| **Immutable ledger** | Tidak ada UPDATE/DELETE pada tabel transaksi — hanya INSERT |
| **Negative balance guard** | `balance >= amount` dicek di dalam transaksi DB, bukan hanya di aplikasi |
| **Batas pengeluaran** | Limit harian per siswa, bisa diset orang tua |
| **Replay attack** | Nonce + timestamp window ±60 detik — disimpan di Redis |
| **HMAC signature** | Setiap request dari device ditandatangani dengan secret unik |
| **Rekonsiliasi otomatis** | Cron harian: total balance seluruh akun harus sama dengan total topup |
| **Dual control** | Topup > Rp 500.000 butuh approval dua operator |

### Layer 6 — Output & Frontend

| Kontrol | Detail |
|---|---|
| **XSS** | React auto-escape semua output; tidak ada `dangerouslySetInnerHTML` |
| **CSP** | `Content-Security-Policy` header ketat — blokir inline script eksternal |
| **Sensitive data masking** | Saldo tidak pernah di-cache di browser storage |
| **Token storage** | Access token di memory (tidak di localStorage) — refresh token di httpOnly cookie |

### Layer 7 — Audit & Monitoring

| Kontrol | Detail |
|---|---|
| **Activity log** | `spatie/laravel-activitylog` — setiap aksi sensitif dicatat (WHO, WHAT, WHEN, FROM IP) |
| **Immutable log** | Log tidak bisa dihapus oleh siapapun termasuk super_admin |
| **Suspicious activity** | Velocity check: transaksi > N kali dalam M menit → flag + notifikasi admin |
| **Failed transaction log** | Setiap transaksi gagal (saldo kurang, kartu frozen, dll) dicatat |
| **Admin action log** | Semua aksi bank_operator dan admin dicatat dengan konteks penuh |
| **Realtime alert** | Anomali rekonsiliasi → notifikasi ke super_admin via email + push |

### Layer 8 — Infrastruktur

| Kontrol | Detail |
|---|---|
| **Secrets management** | Semua secret di `.env`, tidak pernah hardcode, tidak pernah di git |
| **Key rotation** | Device secret bisa dirotasi tanpa downtime (grace period 5 menit) |
| **Backup** | Database backup harian, enkripsi at-rest |
| **Error handling** | Semua exception ditangkap — tidak ada stack trace yang terekspos ke client |
| **Dependency audit** | `composer audit` + `npm audit` pada setiap deploy |

### 9.1 Threat Model Ringkas

| Ancaman | Mitigasi |
|---|---|
| Kartu RFID dicuri | Freeze instan via app/portal; saldo aman di server |
| Kartu RFID dipalsukan (clone) | Mifare Ultralight C 3DES auth + UID whitelist di server |
| Perangkat POS kantin diretas | Device token scope terbatas; HMAC per-request; IP whitelist |
| Operator nakal topup fiktif | Dual log (operator ID + supervisor approval untuk nominal besar); audit trail |
| Man-in-the-middle | TLS 1.3 + HSTS; certificate pinning pada device (future) |
| SQL Injection | Eloquent ORM wajib; parameterized query untuk raw jika diperlukan |
| Brute force login | Rate limit + lockout + exponential backoff |
| Replay attack transaksi | Nonce + timestamp window; server-side nonce store di Redis |
| Manipulasi saldo | Row-level lock + atomic transaction; negative balance guard |
| Double-spend | Idempotency key per transaksi; nonce unique constraint |
| Data siswa bocor | Kartu hanya simpan UID; data personal di server terenkripsi |

---

## 10. Alur Integrasi Antar-Modul

### Alur A: Presensi RFID → LMS + Notifikasi Orang Tua

```
[RFID Reader Kelas]
  POST /api/device/checkin {card_uid, device_id, timestamp, signature}
      │
      ▼
[Skanilan Module]
  → Verifikasi device + signature
  → Identifikasi siswa dari card_uid
  → Simpan rfid_attendance_logs
  → Dispatch: RfidCheckinEvent(user_id, course_id, timestamp)
      │
      ├──→ [LMS Listener]
      │      Catat kehadiran di course_attendances
      │      Jika terlambat → flag & notifikasi guru
      │
      └──→ [Core Notification Listener]
             Push notifikasi ke orang tua: "Budi telah hadir pukul 07.42"
```

### Alur B: Siswa Buat & Jual Produk

```
[Siswa] submit produk di Skanilan Tech
  POST /api/v1/skanilan/units/{id}/products
      │
      ▼
[Skanilan Module]
  → Simpan ke production_items
  → Dispatch: ProductRegisteredEvent
      │
      ▼
[Marketplace Listener]
  → Auto-create product listing di Marketplace
  → Stok = stok Skanilan (event-driven sync)
  → Notifikasi ke admin untuk review (jika diperlukan)
```

### Alur C: Bayar di Kantin via RFID

```
[Kasir Tap Kartu Siswa]
  POST /api/device/pay {card_uid, amount, items, nonce, signature}
      │
      ▼
[Cashless Module]
  → Validasi device + HMAC + nonce + timestamp
  → DB::transaction():
      SELECT balance FOR UPDATE
      Check balance >= amount
      INSERT wallet_transaction (pending)
      UPDATE rfid_accounts balance -= amount
      UPDATE merchant_accounts balance += amount
      UPDATE wallet_transaction (completed)
  → Dispatch: TransactionCompletedEvent
      │
      ├──→ Broadcast ke app siswa (Reverb WebSocket)
      │      "Bayar Rp 15.000 di Kantin Utara"
      │
      └──→ Broadcast ke app orang tua (Reverb)
             "Budi belanja Rp 15.000 - Sisa: Rp 70.000"
```

### Alur D: AI Chatbot Jawab Pertanyaan

```
User: "Apakah buku Clean Code masih ada? Dan berapa saldo saya?"
  POST /api/v1/chatbot/message
      │
      ▼
[Chatbot Module]
  → Query knowledge_base untuk "Clean Code" (Library source)
  → Query rfid_accounts untuk saldo user (jika terautentikasi)
  → Build prompt: [system] + [context data] + [user message]
  → Laravel AI SDK → Gemini 2.0 Flash
      │
      ▼
Response: "Buku 'Clean Code' tersedia, stok 2 dari 3.
           Saldo kamu saat ini Rp 85.000.
           Mau pinjam buku? Klik di sini: [link]"
```

---

## 11. Alur Ekonomi Sirkular

```
01 BELAJAR & BERKARYA
   LMS + Perpustakaan membekali siswa
   Skanilan Tech ubah ilmu jadi produk nyata
         │
         ▼
02 MENJUAL
   Produk masuk Marketplace Sekolah
   Kelas fashion, pangan, IoT, aplikasi
         │
         ▼
03 BERTRANSAKSI
   Tap kartu RFID di POS kantin & marketplace
   Saldo berpindah antar akun dalam ekosistem
         │
         ▼
04 MEMBELANJAKAN
   Saldo dipakai lagi di kantin & koperasi
   Uang tidak keluar dari sistem sekolah
         │
         ▼
05 BERBAGI
   Sebagian waktu & semangat → ThalassemiaGo
   Nilai sosial yang memperkuat reputasi ekosistem
         │
         ▼
06 DIKETAHUI
   AI Chatbot sebarkan info seluruh siklus
   ke setiap warga sekolah & pengunjung
         │
         ▼
07 REINVESTASI
   Revenue unit produksi → modal riset produk baru
   Siklus berputar lebih kuat dari sebelumnya
         │
         ▼
   ↻ kembali ke 01
```

**Apa yang berputar di dalam ekosistem:**
- 💰 Uang (saldo digital)
- 📦 Produk (dibuat, dijual, dikonsumsi dalam sekolah)
- 📚 Ilmu (LMS → Skanilan → produk berkualitas lebih baik)
- ❤️ Nilai sosial (ThalassemiaGo → reputasi → kepercayaan ekosistem)

---

## 12. Roadmap Pengembangan

### Phase 1 — Foundation (Minggu 1–2)

- [ ] Setup monorepo (backend Laravel 13 `--api` + frontend React 19 + Vite)
- [ ] Konfigurasi `nwidart/laravel-modules` + scaffold 9 modul
- [ ] Database migrations semua modul (high-level, iteratif)
- [ ] `spatie/laravel-permission` — definisi roles & permissions
- [ ] Laravel Passport — OAuth2 flow: login, token, refresh, logout
- [ ] Device authentication: device_tokens table + HMAC middleware
- [ ] `spatie/laravel-activitylog` — global audit hook
- [ ] React auth flow: login, token management, axios interceptor, protected routes

### Phase 2 — Bank Sekolah & Cashless (Minggu 3–4)

- [ ] Ledger schema: rfid_accounts, wallet_transactions, merchant_accounts
- [ ] Topup flow: operator input → atomic credit → notifikasi
- [ ] Payment flow: device request → validasi → atomic debit/credit → broadcast
- [ ] Nonce store di Redis (anti-replay)
- [ ] Freeze/unfreeze kartu + saldo transfer ke kartu baru
- [ ] Settlement job harian (`bank:settle`)
- [ ] Rekonsiliasi otomatis + alert anomali
- [ ] Frontend: dashboard saldo siswa, riwayat transaksi, POS kantin (kasir)
- [ ] Frontend: Bank Sekolah admin panel (topup, freeze, laporan)

### Phase 3 — Core Modules (Minggu 5–6)

- [ ] LMS: kursus, lesson, kuis auto-grade, tugas + penilaian
- [ ] Library: katalog, peminjaman, e-book viewer, reminder overdue
- [ ] Skanilan: unit produksi, RFID presensi API, integrasi LMS kehadiran
- [ ] Frontend: semua halaman LMS, Library, Skanilan

### Phase 4 — Marketplace (Minggu 7)

- [ ] Marketplace: listing produk, stok sync dari Skanilan
- [ ] Checkout via saldo RFID (tidak ada payment gateway)
- [ ] Revenue penjual langsung ke saldo mereka
- [ ] Frontend: marketplace, cart, checkout, halaman seller

### Phase 5 — AI, Realtime & ThalassemiaGo (Minggu 8)

- [ ] AI Chatbot: Laravel AI SDK + Gemini, RAG dari knowledge_base
- [ ] ThalassemiaGo: embed + widget darah + pendaftaran donor SSO
- [ ] Laravel Reverb: notifikasi realtime transaksi ke siswa & orang tua
- [ ] Laravel Horizon: monitoring queue
- [ ] Frontend: chatbot widget floating, notifikasi push toast

### Phase 6 — Polish & Lomba (Minggu 9–10)

- [ ] Landing page portal (desain lomba-ready, dark mode)
- [ ] Dashboard admin: statistik ekonomi sirkular, volume transaksi, grafik
- [ ] Mobile-responsive semua halaman
- [ ] Demo seeder: data realistis (siswa, produk, transaksi 30 hari)
- [ ] Rate limit tuning & load test endpoint payment
- [ ] `composer audit` + `npm audit` + dependency update
- [ ] Dokumentasi API (auto-generate)
- [ ] CI/CD setup + deployment ke VPS

---

## 13. Setup & Instalasi

### Prerequisites

```bash
php >= 8.3
composer >= 2.7
node >= 22
npm >= 10
mysql >= 8.0      # wajib InnoDB untuk ACID transactions
redis >= 7        # cache, queue, nonce store
```

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan passport:install --uuids
php artisan horizon          # queue worker
php artisan reverb:start     # websocket server
php artisan serve            # dev server
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 14. Environment Variables

### Backend `.env`

```env
APP_NAME="MySkanilan"
APP_ENV=local
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_DATABASE=myskanilan
DB_USERNAME=root
DB_PASSWORD=

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Security
APP_KEY=                          # wajib ada, generate via artisan
BCRYPT_ROUNDS=12

# Bank Sekolah
BANK_TOPUP_MAX_DAILY=1000000      # Rp 1.000.000 per hari
BANK_TOPUP_MAX_PER_TXN=500000     # Rp 500.000 per transaksi
BANK_SPEND_DEFAULT_DAILY=200000   # limit harian default siswa
BANK_DUAL_APPROVAL_THRESHOLD=500000

# RFID Device
RFID_NONCE_TTL=300               # 5 menit (detik)
RFID_TIMESTAMP_TOLERANCE=60      # ±60 detik

# AI
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Reverb WebSocket
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=localhost
REVERB_PORT=8080

# Mail (notifikasi)
MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=noreply@myskanilan.sch.id
```

### Frontend `.env.local`

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_HOST=localhost
VITE_WS_PORT=8080
VITE_THALASSEMIA_EMBED_URL=https://thalassemiago.my.id
```

---

## 15. Konvensi Kode

### Backend (Laravel 13)

- **PHP 8.3 strict** — `declare(strict_types=1)` di semua file
- **PHP Attributes** — gunakan `#[Attribute]` style L13 untuk middleware di controller, model casting
- **JSON:API Resources** — semua response via `JsonApiResource`, bukan array biasa
- **FormRequest wajib** — validasi di FormRequest, controller hanya orchestrate & return
- **Service layer** — logic bisnis di `Services/`, bukan di controller atau model
- **Events untuk cross-module** — modul berkomunikasi via event, NEVER direct method call antar-modul
- **No N+1** — wajib `eager load`, aktifkan `Model::preventLazyLoading()` di development
- **No raw query** — Eloquent ORM only; jika terpaksa raw, wajib parameterized
- **Transaksi DB** — setiap operasi yang menyentuh lebih dari 1 tabel wajib `DB::transaction()`

### Frontend (React 19)

- **Feature-based** — semua kode satu modul di `src/features/<module>/`
- **TanStack Query** — semua server state via `useQuery`/`useMutation`, bukan `useEffect` + `fetch`
- **Zustand** — hanya client state (auth token di memory, cart, UI preference)
- **No localStorage untuk token** — access token di memory, refresh token di httpOnly cookie
- **TypeScript strict** — `"strict": true` di tsconfig; type semua API response di `src/api/types/`
- **No dangerouslySetInnerHTML** — gunakan React's safe rendering; jika konten HTML wajib, sanitize dulu

---

## Lisensi

MIT © 2026 SMKN 9 Semarang — MySkanilan · Dikembangkan untuk Lomba JHIC
