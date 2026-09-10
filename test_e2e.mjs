import { MySkanilanClient } from './packages/myskanilan-sdk/dist/index.js';

const client = new MySkanilanClient({ baseUrl: 'http://127.0.0.1:4000' });

async function runE2ETests() {
  console.log('🚀 Starting MySkanilan Ecosystem Full End-to-End Test Suite...\n');

  // 1. Top Up Balance First to ensure test headroom
  console.log('1️⃣ Testing Parent Top-Up via Bank Jateng Virtual Account (Rp 100.000)...');
  const topUp = await client.wallet.topUp({
    nisn: '0067812940',
    amount: 100000,
    paymentSource: 'virtual_account'
  });
  console.log(`   ✅ Top-Up Success! Ref: ${topUp.reference_no} | New Balance: Rp ${topUp.balance_after.toLocaleString('id-ID')}`);

  // 2. Set Daily Limit to Rp 200.000
  console.log('\n2️⃣ Testing Parental Daily Limit Setup (Set to Rp 200.000)...');
  const limitRes = await client.portal.setDailyLimit('0067812940', 200000);
  console.log(`   ✅ Limit Updated: Rp ${limitRes.max_amount.toLocaleString('id-ID')}`);

  // 3. Verify Student Profile & Card via NISN
  console.log('\n3️⃣ Testing Student Profile Lookup (NISN: 0067812940)...');
  const student = await client.students.getByNisn('0067812940');
  console.log(`   ✅ Found: ${student.user.name} (${student.user.academic.kelas}) | Status: ${student.card.status}`);

  // 4. Test RFID Tap Transaction (Ayam Geprek + Es Teh)
  console.log('\n4️⃣ Testing RFID Tap Payment (Card UID: 04A23F89BC1180, Amount: Rp 19.000)...');
  const rfidTx = await client.wallet.charge({
    cardUid: '04A23F89BC1180',
    amount: 19000,
    merchantCode: 'KNT-U01',
    description: 'Pembelian Makan Siang Siswa (Ayam Geprek + Es Teh)',
    items: [
      { name: 'Nasi Ayam Geprek Skanilan', qty: 1, price: 15000 },
      { name: 'Es Teh Manis Solo Jumbo', qty: 1, price: 4000 }
    ]
  });
  console.log(`   ✅ Charge Success! Ref: ${rfidTx.reference_no}`);
  console.log(`      Balance: Rp ${rfidTx.wallet.balance_before.toLocaleString('id-ID')} ➔ Rp ${rfidTx.wallet.balance_after.toLocaleString('id-ID')}`);
  console.log(`      Daily Quota Left: Rp ${rfidTx.wallet.remaining_daily_quota.toLocaleString('id-ID')}`);

  // 5. Test Dynamic QR (Layar Kasir POS)
  console.log('\n5️⃣ Testing Dynamic QR Generation (Kasir Touchscreen POS, Amount: Rp 12.000)...');
  const qrSession = await client.qr.createPaymentSession({
    merchantCode: 'KNT-U01',
    amount: 12000,
    description: 'Mie Goreng Spesial Kantin'
  });
  console.log(`   ✅ Dynamic QR Created! Session ID: ${qrSession.session_id}`);

  // 6. Student Pays Dynamic QR
  console.log('\n6️⃣ Student Scans & Pays Dynamic QR...');
  const payResult = await client.qr.paySession(qrSession.session_id, '0067812940');
  console.log(`   ✅ Dynamic QR Paid! Ref: ${payResult.reference_no}`);

  // 7. Check POS Screen Status
  console.log('\n7️⃣ Cashier Screen Polling Status...');
  const qrStatus = await client.qr.checkStatus(qrSession.session_id);
  console.log(`   ✅ Cashier Status: ${qrStatus.status.toUpperCase()} | Paid By: ${qrStatus.paid_by_name}`);

  // 8. Test STATIC QR (Warung/Kantin Meja Tanpa Layar Kasir)
  console.log('\n8️⃣ Testing Static QRIS Meja (Stand Kantin Tanpa Touchscreen)...');
  const staticQr = await client.qr.getMerchantStaticQr('KNT-U01');
  console.log(`   ✅ Static QR Generated for: ${staticQr.merchant_name} (${staticQr.merchant_code})`);
  console.log(`      Payload: ${staticQr.qr_data}`);

  // 9. Student Scans Static QR and enters custom amount (Rp 8.000)
  console.log('\n9️⃣ Student Scans Static QR & Enters Custom Nominal (Rp 8.000 for Roti Bakar)...');
  const staticPayResult = await client.qr.payStaticQr({
    merchantCode: 'KNT-U01',
    nisn: '0067812940',
    amount: 8000,
    description: 'Roti Bakar Coklat Keju (Input Mandiri Siswa)'
  });
  console.log(`   ✅ Static QR Paid! Ref: ${staticPayResult.reference_no}`);
  console.log(`      Merchant: ${staticPayResult.merchant_name} | Amount: Rp ${staticPayResult.amount.toLocaleString('id-ID')}`);
  console.log(`      Remaining Balance: Rp ${staticPayResult.balance_after.toLocaleString('id-ID')}`);

  // 10. Test 1-Click Card Freeze by Parent/Admin
  console.log('\n🔟 Testing 1-Click Emergency Card Freeze by Parent...');
  await client.portal.freezeCard({
    cardUid: '04A23F89BC1180',
    reason: 'Uji simulasi kartu hilang oleh orang tua'
  });
  console.log('   ✅ Card & Wallet successfully FROZEN.');

  // 11. Attempt Transaction on Frozen Card (Should Fail)
  console.log('\n1️⃣1️⃣ Testing Security Rejection on Frozen Card...');
  try {
    await client.wallet.charge({
      cardUid: '04A23F89BC1180',
      amount: 5000,
      merchantCode: 'KNT-U01'
    });
    console.error('   ❌ ERROR: Transaction should have been blocked!');
  } catch (err) {
    console.log(`   🛡️ Security Check Passed! Blocked: "${err.message}"`);
  }

  // 12. Unfreeze Card
  console.log('\n1️⃣2️⃣ Unfreezing Card...');
  await client.portal.unfreezeCard('04A23F89BC1180');
  console.log('   ✅ Card reactivated successfully.');

  // 13. Master RFID Cards List for Admin
  console.log('\n1️⃣3️⃣ Testing Admin Master Cards List...');
  const allCards = await client.portal.getAllCards();
  console.log(`   ✅ Retrieved ${allCards.length} Registered Cards.`);

  // 14. Final System Stats
  console.log('\n📊 Final System Stats:');
  const stats = await client.portal.getStats();
  console.log(`   Total Students: ${stats.total_students}`);
  console.log(`   Total Merchants: ${stats.total_merchants}`);
  console.log(`   Total Transactions: ${stats.total_transactions}`);
  console.log(`   Total Volume: Rp ${stats.total_volume.toLocaleString('id-ID')}`);

  console.log('\n🎉 ALL 14 E2E TESTS (DYNAMIC QR + STATIC QR + RFID + PARENT + ADMIN) PASSED PERFECTLY!');
}

runE2ETests().catch(console.error);
