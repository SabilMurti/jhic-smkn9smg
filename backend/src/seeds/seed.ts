import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { RfidCard } from '../models/RfidCard';
import { Merchant } from '../models/Merchant';
import { Transaction } from '../models/Transaction';
import { QrPaymentSession } from '../models/QrPaymentSession';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myskanilan_central';

export async function seedDatabase() {
  console.log(`🌱 Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);

  console.log('🧹 Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Wallet.deleteMany({}),
    RfidCard.deleteMany({}),
    Merchant.deleteMany({}),
    Transaction.deleteMany({}),
    QrPaymentSession.deleteMany({})
  ]);

  console.log('👤 Seeding Users...');
  const budi = await User.create({
    nisn: '0067812940',
    name: 'Budi Santoso',
    email: 'budi.santoso@smkn9smg.sch.id',
    role: 'siswa',
    academic: {
      jurusan: 'Rekayasa Perangkat Lunak',
      kelas: 'XII RPL 1',
      tahun_masuk: 2024,
      status: 'aktif'
    },
    contact: {
      phone: '081234567890',
      address: 'Jl. Peterongan Sari No. 12, Semarang'
    },
    rfid_binding: {
      card_uid: '04A23F89BC1180',
      assigned_at: new Date()
    }
  });

  const siti = await User.create({
    nisn: '0067812941',
    name: 'Siti Aminah',
    email: 'siti.aminah@smkn9smg.sch.id',
    role: 'siswa',
    academic: {
      jurusan: 'Tata Boga',
      kelas: 'XII TB 2',
      tahun_masuk: 2024,
      status: 'aktif'
    },
    contact: {
      phone: '081298765432',
      address: 'Jl. Sompok Lama No. 5, Semarang'
    },
    rfid_binding: {
      card_uid: '04B34C90CD2291',
      assigned_at: new Date()
    }
  });

  const mbakSriUser = await User.create({
    nisn: 'EMP-KNT-01',
    name: 'Sri Wahyuni (Kantin Mbak Sri)',
    email: 'kantin.sri@smkn9smg.sch.id',
    role: 'kasir_kantin',
    academic: {
      jurusan: 'Kantin Sekolah',
      kelas: 'Kantin Utara',
      tahun_masuk: 2020,
      status: 'aktif'
    },
    contact: {
      phone: '081390123456',
      address: 'Kantin Utara Blok A-01 SMKN 9'
    }
  });

  console.log('💳 Seeding Wallets...');
  const budiWallet = await Wallet.create({
    user_id: budi._id,
    account_type: 'student',
    balance: 85000,
    daily_limit: {
      max_amount: 200000,
      spent_today: 15000,
      last_reset_date: new Date().toISOString().slice(0, 10)
    },
    status: 'active',
    security_flags: {
      is_frozen: false,
      require_pin_above: 50000
    }
  });

  const sitiWallet = await Wallet.create({
    user_id: siti._id,
    account_type: 'student',
    balance: 120000,
    daily_limit: {
      max_amount: 200000,
      spent_today: 0,
      last_reset_date: new Date().toISOString().slice(0, 10)
    },
    status: 'active',
    security_flags: {
      is_frozen: false,
      require_pin_above: 50000
    }
  });

  const merchantWallet = await Wallet.create({
    user_id: mbakSriUser._id,
    account_type: 'merchant',
    balance: 450000,
    daily_limit: {
      max_amount: 10000000,
      spent_today: 0,
      last_reset_date: new Date().toISOString().slice(0, 10)
    },
    status: 'active',
    security_flags: {
      is_frozen: false,
      require_pin_above: 0
    }
  });

  console.log('📡 Seeding RFID Cards...');
  await RfidCard.create([
    {
      card_uid: '04A23F89BC1180',
      uid_hash: 'hash_sha256_04a23f89bc1180',
      card_type: 'mifare_ultralight_c',
      user_id: budi._id,
      status: 'active',
      pin_security: { has_pin: true, pin_code: '123456' }
    },
    {
      card_uid: '04B34C90CD2291',
      uid_hash: 'hash_sha256_04b34c90cd2291',
      card_type: 'mifare_ultralight_c',
      user_id: siti._id,
      status: 'active',
      pin_security: { has_pin: false }
    }
  ]);

  console.log('🏪 Seeding Merchants...');
  await Merchant.create({
    code: 'KNT-U01',
    name: 'Kantin Mbak Sri (Kantin Utara 1)',
    type: 'kantin_utara',
    pic_name: 'Sri Wahyuni',
    phone: '081390123456',
    wallet_id: merchantWallet._id,
    status: 'active'
  });

  console.log('📝 Seeding Sample Transactions...');
  await Transaction.create({
    reference_no: 'TX-20260910-891274',
    type: 'payment',
    status: 'completed',
    amount: 15000,
    source_wallet_id: budiWallet._id,
    destination_wallet_id: merchantWallet._id,
    merchant_code: 'KNT-U01',
    payment_method: 'rfid_card',
    description: 'Pembelian Nasi Ayam Geprek',
    cart_items: [{ name: 'Nasi Ayam Geprek', qty: 1, price: 15000 }],
    balance_snapshot: { before: 100000, after: 85000 }
  });

  console.log('✅ Database seeded successfully!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    });
}
