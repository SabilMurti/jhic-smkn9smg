# JHIC — Ekosistem Digital Terintegrasi SMKN 9 Semarang

> **Lomba Website Sekolah** · Laravel 13 API + React Frontend · Monorepo

[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![PHP](https://img.shields.io/badge/PHP-8.3+-777BB4?logo=php)](https://php.net)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Stack Teknologi](#3-stack-teknologi)
4. [Struktur Monorepo](#4-struktur-monorepo)
5. [Modul & Fitur](#5-modul--fitur)
6. [Skema Database Lengkap](#6-skema-database-lengkap)
7. [API Endpoints](#7-api-endpoints)
8. [Alur Integrasi Antar-Modul](#8-alur-integrasi-antar-modul)
9. [Alur Ekonomi Sirkular](#9-alur-ekonomi-sirkular)
10. [Roadmap Pengembangan](#10-roadmap-pengembangan)
11. [Setup & Instalasi](#11-setup--instalasi)
12. [Environment Variables](#12-environment-variables)
13. [Konvensi Kode](#13-konvensi-kode)

---

## 1. Gambaran Umum

**JHIC** (*Jurusan-Hub Integrated Commerce*) adalah portal identitas digital SMKN 9 Semarang yang menyatukan **7 platform** ke dalam satu ekosistem terintegrasi. Bukan sekadar website profil sekolah — melainkan tulang punggung ekonomi & kepedulian sosial warga sekolah yang benar-benar berjalan.

```
Satu login → Tujuh platform → Satu ekosistem ekonomi sirkular
```

### Tujuh Platform

| # | Platform | Kompleksitas | Fungsi Utama |
|---|----------|:---:|---|
| 1 | **Marketplace Sekolah** | 🔴 Tinggi | Jual-beli produk siswa, QRIS, sinkron stok |
| 2 | **ThalassemiaGo** | 🟡 Sedang | Donor darah, kemitraan RS Kariadi |
| 3 | **Skanilan Tech** | 🔴 Tinggi | Unit produksi IoT, RFID presensi |
| 4 | **LMS Pembelajaran** | 🟡 Sedang | Materi, kuis, tugas, nilai |
| 5 | **AI Chatbot** | 🔴 Tinggi | Asisten AI seluruh ekosistem |
| 6 | **Perpustakaan Online** | 🟡 Sedang | Katalog buku, e-book digital |
| 7 | **Cashless RFID OSIS** | 🔴 Tinggi | Dompet digital, kartu presensi+bayar |

---

## 2. Arsitektur Sistem

### Pola: Modular Monolith

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND (SPA)                    │
│              Vite · React 19 · TanStack Query               │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS / JSON:API
┌─────────────────────────▼───────────────────────────────────┐
│                  LARAVEL 13 API (Backend)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Core /  │  │Marketpla-│  │   LMS    │  │ Library  │   │
│  │   SSO    │  │   ce     │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Skanilan  │  │Cashless  │  │ Chatbot  │  │Thalasse- │   │
│  │  Tech    │  │   RFID   │  │  (AI)    │  │  miaGo   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  Laravel Passport (SSO)  ·  Laravel Reverb (WS)            │
│  Laravel Horizon (Queue) ·  Laravel AI SDK (Chatbot)        │
└───────┬─────────────────────────────────────────┬───────────┘
        │                                         │
┌───────▼───────┐                       ┌─────────▼─────────┐
│     MySQL     │                       │  External Services │
│    + Redis    │                       │  Midtrans (QRIS)   │
│    (Cache/    │                       │  OpenAI / Gemini   │
│    Queue)     │                       │  RS Kariadi API    │
└───────────────┘                       └───────────────────┘
                                                 ▲
                                        ┌────────┴────────┐
                                        │  RFID Hardware  │
                                        │ (REST → Laravel) │
                                        └─────────────────┘
```

### Keputusan Arsitektur

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Pola backend | Modular Monolith | Tim kecil, 1 deploy, integrasi antar-modul mudah |
| Auth | Laravel Passport (OAuth2) | SSO lintas platform, token-based |
| API spec | JSON:API (Laravel 13 native) | Standar, konsisten, mudah di-consume React |
| Realtime | Laravel Reverb + DB driver | Notifikasi live, tanpa Redis wajib |
| Queue | Redis + Laravel Horizon | Job async: notif, AI response, payment callback |
| Module pattern | `nwidart/laravel-modules` | Isolasi kode, tapi tetap 1 codebase |

---

## 3. Stack Teknologi

### Backend — Laravel 13

| Package | Versi | Fungsi |
|---|---|---|
| `laravel/framework` | ^13.0 | Core framework |
| `laravel/passport` | ^13.0 | OAuth2 SSO |
| `laravel/reverb` | ^2.0 | WebSocket server (DB driver) |
| `laravel/horizon` | ^5.0 | Queue dashboard & worker |
| `laravel/ai` | ^1.0 | AI SDK (Gemini/OpenAI) — Laravel 13 stable |
| `nwidart/laravel-modules` | ^11.0 | Modular structure |
| `spatie/laravel-permission` | ^6.0 | Role & permission |
| `spatie/laravel-media-library` | ^11.0 | Upload gambar produk, e-book |
| `spatie/laravel-query-builder` | ^6.0 | Filter/sort/include di API |

### Frontend — React 19

| Package | Versi | Fungsi |
|---|---|---|
| `react` | ^19.0 | UI framework |
| `vite` | ^6.0 | Build tool |
| `@tanstack/react-query` | ^5.0 | Server state, cache, prefetch |
| `react-router-dom` | ^7.0 | Client-side routing |
| `axios` | ^1.7 | HTTP client ke Laravel API |
| `zustand` | ^5.0 | Client state (cart, auth) |
| `tailwindcss` | ^4.0 | Styling |
| `shadcn/ui` | latest | Component library |
| `@radix-ui/*` | latest | Accessible primitives |

### Infrastructure

| Layanan | Stack |
|---|---|
| Runtime | PHP 8.3+, Node.js 22+ |
| Database | MySQL 8.0+ |
| Cache & Queue | Redis 7+ |
| WebSocket | Laravel Reverb (DB driver) |
| Payment | Midtrans (QRIS + VA) |
| AI | Google Gemini 2.0 Flash (via Laravel AI SDK) |
| Storage | Local disk → S3 compatible (prod) |

---

## 4. Struktur Monorepo

```
jhic-smkn9smg/
├── README.md
├── .gitignore
│
├── backend/                          ← Laravel 13 API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/          ← global controllers
│   │   │   ├── Middleware/           ← auth, role, throttle
│   │   │   └── Resources/           ← JSON:API base resources
│   │   ├── Models/                  ← shared Eloquent models
│   │   ├── Services/                ← shared services (Notif, SSO)
│   │   ├── Events/                  ← cross-module events
│   │   └── Listeners/               ← event handlers
│   │
│   ├── Modules/
│   │   ├── Core/                    ← User, Role, SSO, Dashboard
│   │   │   ├── Http/Controllers/
│   │   │   ├── Models/
│   │   │   ├── Routes/api.php
│   │   │   └── Database/migrations/
│   │   │
│   │   ├── Marketplace/             ← Produk, Order, Payment
│   │   ├── Thalassemia/             ← Donor, Notifikasi embed
│   │   ├── Skanilan/                ← Unit produksi, RFID presensi
│   │   ├── LMS/                     ← Kursus, Kuis, Tugas, Nilai
│   │   ├── Chatbot/                 ← AI Layer, Knowledge Base
│   │   ├── Library/                 ← Buku, E-book, Pinjam
│   │   └── Cashless/                ← Kartu RFID, Wallet, Transaksi
│   │
│   ├── config/
│   ├── database/
│   │   ├── migrations/              ← global migrations
│   │   └── seeders/
│   ├── routes/
│   │   └── api.php                  ← route aggregator semua modul
│   └── tests/
│       ├── Feature/
│       └── Unit/
│
└── frontend/                        ← React 19 SPA
    ├── src/
    │   ├── api/                     ← axios instances per modul
    │   ├── components/
    │   │   ├── ui/                  ← shadcn components
    │   │   └── shared/              ← layout, navbar, sidebar
    │   ├── features/                ← 1 folder per modul
    │   │   ├── auth/
    │   │   ├── marketplace/
    │   │   ├── lms/
    │   │   ├── library/
    │   │   ├── skanilan/
    │   │   ├── cashless/
    │   │   ├── chatbot/
    │   │   └── thalassemia/
    │   ├── hooks/                   ← custom hooks
    │   ├── store/                   ← zustand stores
    │   ├── router/                  ← react-router config
    │   └── main.tsx
    ├── public/
    ├── index.html
    ├── vite.config.ts
    └── package.json
```

---

## 5. Modul & Fitur

### 5.1 Core / SSO

**Tanggung jawab:** Fondasi seluruh sistem. Harus selesai pertama.

- **OAuth2 via Laravel Passport** — issue token untuk semua client (React SPA, RFID device, mobile)
- **Role-based access** via `spatie/laravel-permission`
- **User management** — CRUD siswa, guru, admin, orang tua

**Role hierarchy:**
```
admin       → akses penuh semua modul + dashboard statistik
guru        → LMS admin, Library, portal info
siswa       → LMS, Marketplace, Library, Cashless, Chatbot
orang_tua   → LMS (view nilai anak), riwayat transaksi anak
tamu        → Portal publik, Chatbot, profil sekolah
```

---

### 5.2 Marketplace Sekolah 🔴

- Listing produk: fashion, pangan, IoT, aplikasi buatan siswa
- Stok **auto-sync** dari Modul Skanilan (event-driven)
- Payment via **Midtrans QRIS** + **RFID Wallet** (Cashless)
- Seller = siswa/unit produksi, Buyer = siapa saja dalam ekosistem
- Order lifecycle: `pending → paid → processing → shipped → done`

---

### 5.3 ThalassemiaGo 🟡

- **Embed** halaman `thalassemiago.my.id` via iframe + deeplink
- **Notifikasi urgensi darah** di portal utama (polling / webhook dari RS Kariadi)
- Pendaftaran donor: SSO opsional (simpan riwayat donor per user)
- Widget ketersediaan darah real-time di homepage portal

---

### 5.4 Skanilan Tech 🔴

- Manajemen **unit produksi** per jurusan (RPL, Elektronika, Mekatronika, dll)
- **RFID presensi**: hardware → `POST /api/rfid/checkin` → simpan log → broadcast ke LMS & Cashless
- Produk buatan siswa: daftarkan ke Marketplace dengan 1 klik
- Dashboard produksi: target vs realisasi, revenue unit

---

### 5.5 LMS Pembelajaran 🟡

- **Kursus**: buat per mapel/kompetensi, enroll siswa
- **Lesson**: konten teks/video/file, bisa reference e-book dari Library
- **Kuis**: timed, auto-grade, analitik per soal
- **Tugas**: upload file, guru beri nilai & feedback
- Notifikasi deadline tugas → dikirim via **AI Chatbot** channel

---

### 5.6 AI Chatbot 🔴

- Powered by **Laravel AI SDK** (Gemini 2.0 Flash)
- **Knowledge sources** (RAG):
  - Data kursus & materi LMS
  - Katalog Library
  - Info umum sekolah (jadwal, pengumuman, kontak)
  - Status stok Marketplace
- Titik masuk tunggal → arahkan user ke modul yang tepat
- Session chat tersimpan per user (login) / per token (tamu)

---

### 5.7 Perpustakaan Online 🟡

- Katalog buku fisik + e-book digital
- **Peminjaman buku**: cek stok real-time, batas tanggal kembali, reminder
- **E-book**: baca online (PDF viewer), download terbatas
- Referensi langsung dari LMS lesson → e-book
- Chatbot bisa jawab "apakah buku X tersedia?" via API

---

### 5.8 Cashless RFID OSIS 🔴

- **1 kartu RFID** = identitas + dompet + absensi
- **Top up**: via Midtrans QRIS atau setor tunai ke admin (dikonfirmasi manual)
- **Bayar**: scan kartu di Smart Cafe, Marketplace
- **Bank Sekolah**: saldo mengendap di rekening virtual per siswa
- Data transaksi → dashboard literasi keuangan siswa

---

## 6. Skema Database Lengkap

### 6.1 Core

```sql
-- users
CREATE TABLE users (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    role            ENUM('admin','guru','siswa','orang_tua','tamu') DEFAULT 'tamu',
    nisn            VARCHAR(20) UNIQUE NULL,       -- siswa only
    nip             VARCHAR(30) UNIQUE NULL,       -- guru only
    rfid_card_id    BIGINT UNSIGNED NULL,          -- FK → rfid_cards
    avatar          VARCHAR(500) NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    remember_token  VARCHAR(100) NULL,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

-- cross-module notifications
CREATE TABLE notifications (
    id              CHAR(36) PRIMARY KEY,          -- UUID
    user_id         BIGINT UNSIGNED NOT NULL,
    type            VARCHAR(100) NOT NULL,          -- e.g. 'lms.assignment_due'
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    data            JSON,
    module_source   VARCHAR(50),                   -- 'lms'|'marketplace'|'cashless'|...
    read_at         TIMESTAMP NULL,
    created_at      TIMESTAMP
);
```

### 6.2 Marketplace

```sql
CREATE TABLE products (
    id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    seller_id           BIGINT UNSIGNED NOT NULL,  -- FK users
    skanilan_unit_id    BIGINT UNSIGNED NULL,       -- FK production_units
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    category            ENUM('fashion','pangan','iot','aplikasi','lainnya'),
    price               DECIMAL(12,2) NOT NULL,
    stock               INT UNSIGNED DEFAULT 0,
    images              JSON,                      -- array of paths
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);

CREATE TABLE orders (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    buyer_id        BIGINT UNSIGNED NOT NULL,
    total_amount    DECIMAL(12,2) NOT NULL,
    payment_method  ENUM('qris','rfid_wallet') NOT NULL,
    status          ENUM('pending','paid','processing','shipped','done','cancelled') DEFAULT 'pending',
    notes           TEXT NULL,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE TABLE order_items (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id        BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    quantity        INT UNSIGNED NOT NULL,
    price_snapshot  DECIMAL(12,2) NOT NULL,        -- harga saat checkout
    created_at      TIMESTAMP
);

CREATE TABLE payments (
    id                      BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id                BIGINT UNSIGNED NOT NULL,
    user_id                 BIGINT UNSIGNED NOT NULL,
    gateway                 ENUM('midtrans','rfid_wallet') NOT NULL,
    gateway_transaction_id  VARCHAR(255) NULL,
    amount                  DECIMAL(12,2) NOT NULL,
    status                  ENUM('pending','success','failed','refunded') DEFAULT 'pending',
    payload                 JSON NULL,             -- raw Midtrans response
    created_at              TIMESTAMP,
    updated_at              TIMESTAMP
);
```

### 6.3 Skanilan Tech

```sql
CREATE TABLE production_units (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(255) NOT NULL,
    jurusan         VARCHAR(100),
    supervisor_id   BIGINT UNSIGNED NOT NULL,      -- FK users (guru)
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE TABLE rfid_attendance_logs (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    rfid_card_number VARCHAR(64) NOT NULL,
    check_in_at     TIMESTAMP NOT NULL,
    check_out_at    TIMESTAMP NULL,
    device_id       VARCHAR(100),                  -- ID perangkat RFID
    location        VARCHAR(255),
    created_at      TIMESTAMP
);
```

### 6.4 LMS

```sql
CREATE TABLE courses (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    teacher_id      BIGINT UNSIGNED NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    thumbnail       VARCHAR(500) NULL,
    is_published    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE TABLE course_enrollments (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    course_id   BIGINT UNSIGNED NOT NULL,
    student_id  BIGINT UNSIGNED NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (course_id, student_id)
);

CREATE TABLE lessons (
    id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    course_id           BIGINT UNSIGNED NOT NULL,
    library_ebook_id    BIGINT UNSIGNED NULL,      -- FK ebooks (integrasi Library)
    title               VARCHAR(255) NOT NULL,
    content             LONGTEXT,
    type                ENUM('text','video','file') DEFAULT 'text',
    `order`             INT UNSIGNED DEFAULT 0,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);

CREATE TABLE quizzes (
    id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    course_id           BIGINT UNSIGNED NOT NULL,
    lesson_id           BIGINT UNSIGNED NULL,
    title               VARCHAR(255) NOT NULL,
    duration_minutes    INT UNSIGNED DEFAULT 30,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);

CREATE TABLE quiz_questions (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    quiz_id         BIGINT UNSIGNED NOT NULL,
    question        TEXT NOT NULL,
    options         JSON NOT NULL,                 -- ["A","B","C","D"]
    correct_answer  VARCHAR(10) NOT NULL,
    points          INT UNSIGNED DEFAULT 10,
    created_at      TIMESTAMP
);

CREATE TABLE quiz_attempts (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    quiz_id     BIGINT UNSIGNED NOT NULL,
    student_id  BIGINT UNSIGNED NOT NULL,
    answers     JSON,                              -- {"q_id": "answer"}
    score       DECIMAL(5,2) NULL,
    started_at  TIMESTAMP NOT NULL,
    finished_at TIMESTAMP NULL
);

CREATE TABLE assignments (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    course_id   BIGINT UNSIGNED NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    due_date    TIMESTAMP NOT NULL,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

CREATE TABLE submissions (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    assignment_id   BIGINT UNSIGNED NOT NULL,
    student_id      BIGINT UNSIGNED NOT NULL,
    content         TEXT NULL,
    file_path       VARCHAR(500) NULL,
    grade           DECIMAL(5,2) NULL,
    feedback        TEXT NULL,
    submitted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at       TIMESTAMP NULL
);
```

### 6.5 Library

```sql
CREATE TABLE books (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    title           VARCHAR(255) NOT NULL,
    author          VARCHAR(255),
    publisher       VARCHAR(255),
    isbn            VARCHAR(20) UNIQUE NULL,
    category        VARCHAR(100),
    year            YEAR,
    cover_image     VARCHAR(500) NULL,
    stock_total     INT UNSIGNED DEFAULT 1,
    stock_available INT UNSIGNED DEFAULT 1,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE TABLE ebooks (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    title       VARCHAR(255) NOT NULL,
    author      VARCHAR(255),
    category    VARCHAR(100),
    file_path   VARCHAR(500) NOT NULL,
    cover_image VARCHAR(500) NULL,
    is_public   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

CREATE TABLE book_loans (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    book_id     BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date    TIMESTAMP NOT NULL,
    returned_at TIMESTAMP NULL,
    status      ENUM('active','returned','overdue') DEFAULT 'active',
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

CREATE TABLE ebook_accesses (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    ebook_id    BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.6 Cashless RFID OSIS

```sql
CREATE TABLE rfid_cards (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    card_number     VARCHAR(64) UNIQUE NOT NULL,   -- chip UID
    user_id         BIGINT UNSIGNED NULL,           -- NULL = belum di-assign
    balance         DECIMAL(12,2) DEFAULT 0.00,
    is_active       BOOLEAN DEFAULT TRUE,
    issued_at       TIMESTAMP NULL,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE TABLE wallet_transactions (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    rfid_card_id    BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NULL,
    type            ENUM('topup','payment','refund','transfer') NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    balance_before  DECIMAL(12,2) NOT NULL,
    balance_after   DECIMAL(12,2) NOT NULL,
    reference_id    VARCHAR(255) NULL,             -- order_id / topup_id
    description     VARCHAR(255),
    created_at      TIMESTAMP
);

CREATE TABLE topup_requests (
    id                      BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id                 BIGINT UNSIGNED NOT NULL,
    rfid_card_id            BIGINT UNSIGNED NOT NULL,
    amount                  DECIMAL(12,2) NOT NULL,
    payment_method          ENUM('qris','cash_admin') NOT NULL,
    midtrans_transaction_id VARCHAR(255) NULL,
    confirmed_by            BIGINT UNSIGNED NULL,  -- FK users (admin)
    status                  ENUM('pending','confirmed','failed') DEFAULT 'pending',
    created_at              TIMESTAMP,
    updated_at              TIMESTAMP
);

CREATE TABLE smart_cafe_transactions (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    rfid_card_id    BIGINT UNSIGNED NOT NULL,
    cashier_user_id BIGINT UNSIGNED NOT NULL,
    items           JSON NOT NULL,                 -- [{name, qty, price}]
    total_amount    DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMP
);
```

### 6.7 Chatbot

```sql
CREATE TABLE chat_sessions (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NULL,           -- NULL = tamu
    session_token   VARCHAR(64) UNIQUE NOT NULL,
    started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at  TIMESTAMP NULL
);

CREATE TABLE chat_messages (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    session_id  BIGINT UNSIGNED NOT NULL,
    role        ENUM('user','assistant') NOT NULL,
    content     TEXT NOT NULL,
    tokens_used INT NULL,
    created_at  TIMESTAMP
);

CREATE TABLE knowledge_base (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    source      ENUM('lms','library','school_info','announcement') NOT NULL,
    ref_id      BIGINT UNSIGNED NULL,              -- ID sumber asli
    title       VARCHAR(255),
    content     TEXT NOT NULL,
    embedding   JSON NULL,                         -- vector (future)
    updated_at  TIMESTAMP
);
```

---

## 7. API Endpoints

Semua endpoint diawali `/api/v1/`. Auth header: `Authorization: Bearer {token}`

### Auth

```
POST   /api/v1/auth/login              → issue token
POST   /api/v1/auth/logout             → revoke token
GET    /api/v1/auth/me                 → user profile + role
POST   /api/v1/auth/refresh            → refresh token
```

### Core

```
GET    /api/v1/users                   → list users [admin]
POST   /api/v1/users                   → create user [admin]
GET    /api/v1/users/{id}              → user detail
PATCH  /api/v1/users/{id}             → update user
```

### Marketplace

```
GET    /api/v1/marketplace/products          → list produk (filter: category, seller)
POST   /api/v1/marketplace/products          → buat produk [siswa/admin]
GET    /api/v1/marketplace/products/{id}     → detail produk
PATCH  /api/v1/marketplace/products/{id}     → update produk
DELETE /api/v1/marketplace/products/{id}     → hapus produk

POST   /api/v1/marketplace/orders            → buat order
GET    /api/v1/marketplace/orders            → list order saya
GET    /api/v1/marketplace/orders/{id}       → detail order
PATCH  /api/v1/marketplace/orders/{id}/status → update status [admin/seller]

POST   /api/v1/marketplace/payments/qris     → init Midtrans QRIS
POST   /api/v1/marketplace/payments/wallet   → bayar via RFID wallet
POST   /api/v1/marketplace/payments/callback → Midtrans webhook
```

### LMS

```
GET    /api/v1/lms/courses                   → list kursus
POST   /api/v1/lms/courses                   → buat kursus [guru]
GET    /api/v1/lms/courses/{id}/lessons      → list lesson
POST   /api/v1/lms/courses/{id}/lessons      → tambah lesson [guru]
POST   /api/v1/lms/courses/{id}/enroll       → daftar kursus [siswa]

GET    /api/v1/lms/quizzes/{id}              → detail kuis
POST   /api/v1/lms/quizzes/{id}/attempt      → mulai/submit kuis [siswa]

GET    /api/v1/lms/assignments               → list tugas saya
POST   /api/v1/lms/assignments/{id}/submit   → kumpulkan tugas [siswa]
PATCH  /api/v1/lms/submissions/{id}/grade    → beri nilai [guru]
```

### Library

```
GET    /api/v1/library/books                 → katalog buku
GET    /api/v1/library/ebooks                → katalog e-book
POST   /api/v1/library/books/{id}/loan       → pinjam buku [siswa]
PATCH  /api/v1/library/loans/{id}/return     → kembalikan buku
GET    /api/v1/library/ebooks/{id}/read      → akses e-book [autentikasi]
```

### Cashless RFID

```
GET    /api/v1/cashless/balance              → cek saldo kartu saya
POST   /api/v1/cashless/topup               → request top up
GET    /api/v1/cashless/transactions         → riwayat transaksi
POST   /api/v1/cashless/pay                 → bayar (dari kasir cafe)

-- RFID Device endpoints (device auth token)
POST   /api/v1/rfid/checkin                 → log presensi masuk
POST   /api/v1/rfid/checkout                → log presensi keluar
POST   /api/v1/rfid/scan-pay               → bayar via scan kartu
```

### Chatbot

```
POST   /api/v1/chatbot/session              → buat session baru
POST   /api/v1/chatbot/message              → kirim pesan, dapat respons AI
GET    /api/v1/chatbot/sessions/{id}/history → riwayat chat
```

### Skanilan Tech

```
GET    /api/v1/skanilan/units               → list unit produksi
POST   /api/v1/skanilan/units/{id}/products → daftarkan produk ke Marketplace
GET    /api/v1/skanilan/attendance          → log presensi RFID [guru/admin]
```

---

## 8. Alur Integrasi Antar-Modul

### Alur: Presensi RFID → LMS + Cashless

```
RFID Hardware
    │ POST /api/v1/rfid/checkin {card_number, device_id}
    ▼
Skanilan Module
    │ → simpan rfid_attendance_logs
    │ → dispatch RfidCheckinEvent
    ▼
Event Listeners (async via Queue)
    ├── LMS Listener      → catat kehadiran siswa di kursus hari ini
    └── Cashless Listener → (opsional) reward poin kehadiran ke wallet
```

### Alur: Siswa Buat Produk → Marketplace

```
Siswa submit produk di Skanilan Tech
    │ POST /api/v1/skanilan/units/{id}/products
    ▼
Skanilan Module
    │ → simpan ke production_units
    │ → auto-create di products table (Marketplace)
    │ → dispatch ProductPublishedEvent
    ▼
Marketplace Module
    │ → produk langsung aktif di listing
    └── Notifikasi ke admin untuk review (opsional)
```

### Alur: Bayar di Marketplace via RFID Wallet

```
Buyer pilih "Bayar RFID Wallet"
    │ POST /api/v1/marketplace/payments/wallet {order_id, rfid_card_id}
    ▼
Marketplace\PaymentController
    │ → cek saldo di rfid_cards (Cashless module service)
    │ → jika cukup: deduct balance, buat wallet_transaction
    │ → update order status → 'paid'
    │ → dispatch OrderPaidEvent
    ▼
Order Module
    │ → notifikasi ke seller (Realtime: Reverb broadcast)
    └── notifikasi ke buyer
```

### Alur: AI Chatbot Menjawab

```
User kirim pesan: "Apakah buku 'Clean Code' tersedia?"
    │ POST /api/v1/chatbot/message
    ▼
Chatbot Module
    │ → query knowledge_base (Library source, title LIKE 'Clean Code')
    │ → build prompt: [system context] + [book data] + [user message]
    │ → Laravel AI SDK → Gemini 2.0 Flash
    ▼
Response: "Buku 'Clean Code' oleh Robert C. Martin tersedia, stok: 2.
          Kamu bisa pinjam di perpustakaan atau lihat di /library"
    │ → simpan ke chat_messages
    └── return ke frontend
```

---

## 9. Alur Ekonomi Sirkular

```
01 BELAJAR & BERKARYA          02 MENJUAL
LMS + Perpustakaan         →   Marketplace Sekolah
  ↑                                    ↓
08 KEMBALI KE 01           ←   03 BERTRANSAKSI
Modal lebih kuat               QRIS + RFID Wallet
  ↑                                    ↓
07 REINVESTASI             ←   04 MEMBELANJAKAN
Hasil → modal riset baru       Smart Cafe + Marketplace
  ↑                                    ↓
06 DIKETAHUI               ←   05 BERBAGI
AI Chatbot sebarkan info       ThalassemiaGo donor darah
```

**Prinsip:** Uang, ilmu, produk, dan nilai sosial tidak bocor keluar — terus berputar dalam ekosistem sekolah.

---

## 10. Roadmap Pengembangan

### Phase 1 — Foundation (Minggu 1–2)
- [ ] Setup monorepo structure
- [ ] Laravel 13 `--api` install, konfigurasi dasar
- [ ] React + Vite + TailwindCSS + shadcn/ui setup
- [ ] Database schema semua modul + migrations
- [ ] `nwidart/laravel-modules` setup + 8 modul scaffold
- [ ] `spatie/laravel-permission` — role & permission
- [ ] Laravel Passport — OAuth2 SSO
- [ ] Auth endpoints (login, logout, me)
- [ ] React auth flow (login page, token storage, axios interceptor)

### Phase 2 — Core Modules (Minggu 3–4)
- [ ] LMS: kursus, lesson, kuis, tugas, nilai
- [ ] Library: katalog, peminjaman, e-book viewer
- [ ] Skanilan Tech: unit produksi, RFID attendance API
- [ ] Frontend: halaman LMS, Library, Skanilan

### Phase 3 — Commerce (Minggu 5–6)
- [ ] Marketplace: produk, order, stok auto-sync dari Skanilan
- [ ] Cashless RFID: kartu, wallet, transaksi
- [ ] Midtrans integration (QRIS topup + payment)
- [ ] Smart Cafe POS interface (kasir)
- [ ] Frontend: marketplace, cart, checkout, wallet dashboard

### Phase 4 — AI & Realtime (Minggu 7–8)
- [ ] AI Chatbot: Laravel AI SDK + Gemini, RAG knowledge base
- [ ] ThalassemiaGo: embed + notifikasi urgensi darah
- [ ] Laravel Reverb: notifikasi realtime (order, nilai, darah)
- [ ] Laravel Horizon: queue dashboard
- [ ] Frontend: chatbot widget, notifikasi realtime

### Phase 5 — Polish & Lomba (Minggu 9–10)
- [ ] Dashboard admin (statistik ekonomi sirkular)
- [ ] Landing page portal (desain lomba-ready)
- [ ] Mobile-responsive semua halaman
- [ ] Testing: Feature tests per modul, load test Chatbot
- [ ] Dokumentasi API (auto-generate)
- [ ] Demo data seeder lengkap
- [ ] Deployment & CI/CD

---

## 11. Setup & Instalasi

### Prerequisites

```bash
# Required
php >= 8.3
composer >= 2.7
node >= 22
npm >= 10
mysql >= 8.0
redis >= 7
```

### Backend

```bash
cd backend

# Install dependencies
composer install

# Copy environment
cp .env.example .env

# Generate key
php artisan key:generate

# Run migrations + seeders
php artisan migrate --seed

# Install Passport keys
php artisan passport:install

# Start queue worker
php artisan horizon

# Start WebSocket server
php artisan reverb:start

# Start development server
php artisan serve
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment
cp .env.example .env.local

# Start development server
npm run dev
```

---

## 12. Environment Variables

### Backend `.env`

```env
APP_NAME="JHIC SMKN9"
APP_ENV=local
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=jhic_smkn9
DB_USERNAME=root
DB_PASSWORD=

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# AI (Laravel AI SDK)
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Reverb WebSocket
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=localhost
REVERB_PORT=8080
```

### Frontend `.env.local`

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_HOST=localhost
VITE_WS_PORT=8080
VITE_THALASSEMIA_URL=https://thalassemiago.my.id
```

---

## 13. Konvensi Kode

### Backend (Laravel 13)

- **PHP Attributes** — gunakan `#[Attribute]` style Laravel 13 untuk middleware, model casting, dll
- **JSON:API Resources** — semua response pakai `JsonApiResource` (Laravel 13 native)
- **Form Requests** — validasi WAJIB di `FormRequest`, bukan di controller
- **Service Layer** — logic bisnis di `Services/`, controller hanya orchestrate
- **Events & Listeners** — komunikasi antar-modul via event, BUKAN direct method call
- **No N+1** — wajib `eager load` relasi, aktifkan `Model::preventLazyLoading()` di dev

### Frontend (React 19)

- **Feature-based structure** — 1 folder per modul di `src/features/`
- **TanStack Query** — semua server state via `useQuery`/`useMutation`, bukan `useState` + `useEffect`
- **Zustand** — hanya untuk client state (auth token, cart, UI state)
- **Typed API calls** — TypeScript strict, definisi type di `src/api/types/`

---

## Lisensi

MIT © 2026 SMKN 9 Semarang — Dikembangkan untuk Lomba Website Sekolah
