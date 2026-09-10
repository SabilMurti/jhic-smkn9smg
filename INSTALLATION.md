# 🚀 Panduan Instalasi & Menjalankan Proyek MySkanilan Ecosystem

Dokumen ini ditujukan bagi seluruh tim pengembang (developer, reviewer, tester) agar dapat meng-clone, menginstal seluruh dependensi, mengonfigurasi database, serta menjalankan ekosistem **MySkanilan SMKN 9 Semarang** secara lokal tanpa hambatan.

---

## 1. 🏗️ Arsitektur & Tech Stack

Proyek ini dibangun dengan pendekatan arsitektur monorepo modular yang terdiri dari 4 komponen utama:

```
jhic-smkn9smg/
├── backend/                  # Central Data Gateway, Financial Ledger & REST API
├── packages/
│   └── myskanilan-sdk/       # Universal Middleware Client SDK (Zero-dependency ESM)
├── apps/
│   ├── merchant-pos/         # Web Kantin POS & Siswa Self-Order (Touchscreen / Responsive)
│   └── portal-web/           # Portal Web Siswa, Orang Tua, Kantin, & Admin (3D Smart Card)
└── test_e2e.mjs              # Automated End-to-End Test Suite
```

### Rincian Versi Teknologi

| Komponen | Stack / Framework | Versi | Port Lokal | Peran Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | MongoDB Server | `>= 7.0` (Direkomendasikan `8.0.30`) | `27017` | Native Database Ledger, ACID Transactions |
| **Backend Core** | Node.js + Express + TypeScript | Node `>= 20.x`, TS `5.5.4`, Express `4.19` | `4000` | Central Gateway, Otentikasi, Mutasi Saldo |
| **Middleware SDK** | TypeScript ESM Library | TS `5.5.4` | - | Abstraksi RFID, QRIS, Direct Pay, & Portal API |
| **Kantin POS & Web** | React 18 + Vite 5 | React `18.3.1`, Vite `5.4.2` | `5173` | Kasir Stand & Self-Order Mandiri Siswa |
| **Portal Web** | React 18 + Vite 5 + html5-qrcode | React `18.3.1`, HTML5-QRCode `2.3.8` | `3000` | Hub Multi-Peran, 3D Tilt Card, Live Cam Scanner |

---

## 2. 📋 Prasyarat Sistem (Prerequisites)

Pastikan lingkungan komputer Anda telah terinstal:

1. **Operating System (100% Cross-Platform)**:
   - **Windows 10 / 11** (Native via Command Prompt, PowerShell, atau WSL2)
   - **Linux** (Ubuntu 22.04 LTS / 24.04 LTS, Debian, Arch, Fedora)
   - **macOS** (Apple Silicon M1/M2/M3/M4 atau Intel)
2. **Node.js**:
   - Versi LTS: **`v20.x`**, **`v22.x`**, atau **`v24.x`** (Pengujian berhasil pada `v24.18.0`).
   - Cek versi: `node -v`
3. **Package Manager**:
   - npm `>= 10.x` (Pengujian pada `11.16.0`).
   - Cek versi: `npm -v`
4. **Git**:
   - Untuk mengelola source code.
5. **MongoDB Server**:
   - Server MongoDB berjalan lokal di port `27017`.

---

## 3. 🗄️ Setup Database MongoDB

Anda dapat memilih salah satu cara instalasi sesuai sistem operasi Anda:

### Opsi A: Native Windows (MSI Installer / Winget)
Untuk pengguna Windows native (CMD atau PowerShell):

```powershell
# 1. Install MongoDB Server otomatis via Windows Package Manager (Winget):
winget install MongoDB.Server

# 2. (Opsional) Install MongoDB Compass untuk melihat visual data tabel:
winget install MongoDB.Compass
```
*Catatan: Installer Windows otomatis mendaftarkan MongoDB sebagai Windows Service di latar belakang (dapat dicek di `services.msc` -> `MongoDB Server`), sehingga database langsung aktif di `mongodb://127.0.0.1:27017` tanpa perlu terminal khusus.*

---

### Opsi B: Native MongoDB di Linux / WSL2 Ubuntu
Jika Anda menggunakan WSL2 atau Ubuntu native:

```bash
# 1. Install dependencies & kunci GPG MongoDB
sudo apt update && sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

# 2. Tambahkan repository MongoDB 8.0
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# 3. Install MongoDB
sudo apt update && sudo apt install -y mongodb-org

# 4. Jalankan MongoDB Daemon
sudo systemctl enable --now mongod

# Atau jika di WSL tanpa systemd aktif:
sudo mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /var/lib/mongodb
```

Verifikasi MongoDB aktif:
```bash
mongosh --eval "db.adminCommand('ping')"
# Harus menghasilkan: { ok: 1 }
```

---

### Opsi C: Menggunakan Docker (Multi-Platform: Windows, Mac, Linux)
Jika di komputer Anda sudah terinstal Docker Desktop:

```bash
docker run -d \
  --name myskanilan-mongo \
  -p 27017:27017 \
  --restart always \
  mongo:8.0
```

---

## 4. ⚡ Panduan Cepat Khusus Pengguna Windows (1-Click Setup & Run)

Bagi tim yang menggunakan **Windows (CMD / File Explorer)**, kami telah menyediakan skrip otomatis:

### 1. Setup & Install Sekaligus (Hanya dijalankan sekali di awal)
Cukup klik ganda (double-click) file:
👉 **`install-windows.bat`**

Atau jalankan dari Command Prompt / PowerShell di root proyek:
```cmd
.\install-windows.bat
```
Skrip ini akan otomatis menginstal package SDK, mem-build SDK, menginstal backend, menyalin `.env`, menginstal aplikasi web, dan melakukan seeding database demo.

### 2. Menjalankan Semua Layanan Sekaligus
Cukup klik ganda (double-click) file:
👉 **`start-windows.bat`**

*(Atau jika menggunakan PowerShell: `powershell -ExecutionPolicy Bypass -File .\start-windows.ps1`)*

Skrip ini akan otomatis:
1. Membuka 3 jendela Command Prompt terpisah untuk **Backend (4000)**, **Web Kantin (5173)**, dan **Portal Web (3000)**.
2. Membuka browser secara otomatis ke `http://localhost:3000`.

---

## 5. 📦 Langkah Manual Instalasi & Build (Cross-Platform)

Jika Anda ingin menjalankan instalasi secara manual langkah demi langkah (berlaku di Windows, Linux, dan macOS):

> [!IMPORTANT]
> **Urutan Instalasi Wajib Diperhatikan!**  
> Karena `merchant-pos` dan `portal-web` menggunakan `@myskanilan/sdk` dari direktori lokal (`file:../../packages/myskanilan-sdk`), Anda **WAJIB melakukan build pada SDK terlebih dahulu** sebelum menjalankan aplikasi lain.

### Cara Ringkas (Via Root NPM Scripts):
Di root folder proyek, jalankan:
```bash
# Otomatis install semua dependensi, build SDK, buat .env, dan seed database
npm run setup
```

### Langkah 1: Clone Repository
```bash
git clone <repository-url> jhic-smkn9smg
cd jhic-smkn9smg
```

### Langkah 2: Build Middleware SDK
```bash
cd packages/myskanilan-sdk
npm install
npm run build
cd ../..
```
*Output build berupa file JavaScript & deklarasi tipe akan digenerate ke folder `packages/myskanilan-sdk/dist/`.*

### Langkah 3: Setup Backend & Seeding Data
```bash
cd backend
npm install

# Buat file .env (jika belum ada)
cat << 'EOF' > .env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/myskanilan_central
JWT_SECRET=myskanilan_super_secret_jwt_key_2026
DEVICE_SECRET=dev_secret_kantin_utara_999
CORS_ORIGIN=*
EOF

# Jalankan Seeding Data Awal (Siswa, Kartu RFID, Dompet, Merchant Kantin, Stand Menu)
npm run seed

# Build Backend
npm run build
cd ..
```

### Langkah 4: Setup Aplikasi Web Kantin POS
```bash
cd apps/merchant-pos
npm install
cd ../..
```

### Langkah 5: Setup Portal Web Siswa & Wali
```bash
cd apps/portal-web
npm install
cd ../..
```

---

## 5. 🚦 Menjalankan Ekosistem (Development Mode)

Buka **3 jendela terminal terpisah** (atau gunakan tmux/split terminal):

### Terminal 1: Backend API Gateway (Port 4000)
```bash
cd backend
npm run dev
```
*Server aktif di: `http://localhost:4000`*

### Terminal 2: Web Kantin POS & Self-Order (Port 5173)
```bash
cd apps/merchant-pos
npm run dev
```
*Aplikasi aktif di: `http://localhost:5173`*

### Terminal 3: Portal Web Siswa & Wali (Port 3000)
```bash
cd apps/portal-web
npm run dev
```
*Aplikasi aktif di: `http://localhost:3000`*

---

## 6. 🧪 Menjalankan Automated End-to-End (E2E) Test Suite

Untuk memastikan seluruh API, SDK, mutasi saldo, limit harian, dan pembayaran QRIS/RFID bekerja 100% normal:

```bash
# Pastikan Backend (Port 4000) sedang berjalan
node test_e2e.mjs
```

Tes ini akan menguji secara otomatis:
1. Top Up Saldo Siswa via Virtual Account Bank Jateng.
2. Konfigurasi Batas Jajan Harian (*Parental Daily Limit*).
3. Lookup Profil Siswa & Kartu RFID.
4. Transaksi Tap Kartu RFID Mifare Ultralight C.
5. Pembuatan Sesi Dynamic QRIS Kasir.
6. Pembayaran Dynamic QRIS via Akun Siswa.
7. Polling Status Layar Kasir POS (*Auto-Flip Receipt*).
8. Pembayaran Static QRIS Meja Akrilik dengan input nominal mandiri.
9. Pembayaran Langsung Mandiri (*In-App Direct Pay / Self-Order*).
10. Proteksi Pembatasan Limit Harian Orang Tua (*Daily Limit Exceeded Guard*).
11. Fitur Darurat 1-Click Card Freeze & Unfreeze.

---

## 7. 👥 Akun Uji Coba & Kredensial Demo

Data berikut telah terisi secara default melalui perintah `npm run seed`:

### A. Akun Siswa
| Nama Siswa | NISN | Kelas | UID Kartu RFID | Saldo Awal | Limit Harian |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Budi Santoso** | `0067812940` | XII RPL 1 | `04A23F89BC1180` | Rp 75.000 | Rp 200.000 / hari |
| **Siti Aminah** | `0067812941` | XII TB 2 | `04B34C90CD2291` | Rp 42.000 | Rp 60.000 / hari |

### B. Akun Orang Tua / Wali
- **Hendra Santoso**: Wali dari Budi Santoso (memiliki hak kontrol limit jajan harian, top up saldo anak, dan 1-click card freeze).

### C. Merchant Stand Kantin
- **Stand #01**: Kantin Mbak Sri
  - Kode Merchant: `KNT-U01`
  - Kategori: Makanan & Minuman
  - Bebas Biaya Transaksi: **100% Zero MDR Fee**

### D. Akun Admin Sekolah
- **Dra. Hj. Ratna**: Kepala TU / Admin Sistem (memiliki akses audit master kartu RFID, pembekuan kartu massal, dan monitoring float fund).

---

## 8. 🌐 Panduan Penggunaan URL Aplikasi

| Layanan | URL Browser | Deskripsi Penggunaan |
| :--- | :--- | :--- |
| **Portal Web Multi-Peran** | [`http://localhost:3000`](http://localhost:3000) | Dashboard 4 Peran (Siswa, Wali, Kantin, Admin). Berisi Kartu Digital 3D, pemindai kamera live, slider limit jajan orang tua, dan rekap omzet kantin. |
| **Web Kantin (Mode Siswa)** | [`http://localhost:5173?mode=student`](http://localhost:5173?mode=student) | Mode pemesanan mandiri untuk siswa. Menampilkan saldo, sisa kuota, menu kantin, input catatan pesanan, dan tombol **Bayar Langsung**. |
| **Web Kantin (Mode Kasir)** | [`http://localhost:5173?mode=cashier`](http://localhost:5173?mode=cashier) | Mode kasir touchscreen stand kantin. Mendukung tombol **Tap Kartu RFID**, **QRIS Dinamis**, dan auto-flip struk hijau. |
| **Backend REST API** | [`http://localhost:4000/api/v1`](http://localhost:4000/api/v1) | Endpoint JSON API untuk integrasi sistem eksternal, bank, atau perangkat IoT reader. |

---

## 9. 🛠️ Pemecahan Masalah (Troubleshooting)

### 1. Error: `Cannot find module '@myskanilan/sdk'`
- **Penyebab**: SDK belum di-compile sebelum aplikasi web dijalankan.
- **Solusi**:
  ```bash
  cd packages/myskanilan-sdk
  npm run build
  ```

### 2. Error: `connect ECONNREFUSED 127.0.0.1:27017`
- **Penyebab**: Service MongoDB belum berjalan di komputer Anda.
- **Solusi**:
  - Di Linux/WSL: `sudo systemctl start mongod` atau `sudo mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /var/lib/mongodb`
  - Di Docker: `docker start myskanilan-mongo`

### 3. Error: `EADDRINUSE: address already in use :::4000` (atau port 5173 / 3000)
- **Penyebab**: Port sedang dipakai oleh proses latar belakang sebelumnya.
- **Solusi**:
  ```bash
  # Cari dan matikan proses pada port yang bentrok (contoh port 4000):
  npx kill-port 4000
  # Atau untuk port lain:
  npx kill-port 5173 3000
  ```

### 4. Kamera Pemindai QR Tidak Terbuka di Portal Siswa
- **Penyebab**: Browser membatasi akses webcam (`getUserMedia`) jika tidak diakses melalui protokol aman (`https://` atau `localhost`).
- **Solusi**: Pastikan Anda membuka melalui `http://localhost:3000` (bukan menggunakan IP lokal seperti `http://192.168.x.x` tanpa sertifikat SSL) dan berikan izin (*Allow*) akses kamera ketika browser meminta konfirmasi.

