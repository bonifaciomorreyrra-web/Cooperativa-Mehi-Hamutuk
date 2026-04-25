'use strict';
/**
 * Seeds Firestore with initial data for KMH Portal.
 * Run: node src/db/seed-firestore.js
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var or Firebase emulator.
 */
require('dotenv').config();
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

admin.initializeApp();
const db = admin.firestore();

async function seed() {
  console.log('🌱 Seeding Firestore...');

  // Clear existing data
  const cols = ['users', 'members', 'savings', 'loans', 'loan_repayments', 'investors', 'notifications', 'counters'];
  for (const col of cols) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  }
  console.log('  Cleared existing collections');

  // Counters
  await db.collection('counters').doc('main').set({ memberCount: 3, loanCount: 2, investorCount: 1 });

  // Users
  const now = new Date().toISOString();
  const presidentRef = db.collection('users').doc();
  await presidentRef.set({ username: 'president', password_hash: bcrypt.hashSync('president123', 10), role: 'president', is_active: true, created_at: now });

  const adminRef = db.collection('users').doc();
  await adminRef.set({ username: 'admin', password_hash: bcrypt.hashSync('admin123', 10), role: 'admin', is_active: true, created_at: now });

  const user1Ref = db.collection('users').doc();
  await user1Ref.set({ username: 'mario.silva', password_hash: bcrypt.hashSync('member123', 10), role: 'member', is_active: true, created_at: now });

  const user2Ref = db.collection('users').doc();
  await user2Ref.set({ username: 'ana.santos', password_hash: bcrypt.hashSync('member123', 10), role: 'member', is_active: true, created_at: now });

  const user3Ref = db.collection('users').doc();
  await user3Ref.set({ username: 'joao.costa', password_hash: bcrypt.hashSync('member123', 10), role: 'member', is_active: true, created_at: now });

  console.log('  ✅ Users created');

  // Members
  const m1Ref = db.collection('members').doc();
  await m1Ref.set({
    user_id: user1Ref.id, member_no: 'MH-0001', full_name: 'Mário da Silva',
    bi_electoral_no: 'BI-001234', date_of_birth: '1990-03-15', place_of_birth: 'Dili',
    profession: 'Profesór', address: 'Rua Caicoli, Dili', phone: '+67077100001',
    email: 'mario.silva@email.com', member_type: 'employee', photo_url: null,
    joined_date: '2024-01-15', status: 'active', created_at: now
  });

  const m2Ref = db.collection('members').doc();
  await m2Ref.set({
    user_id: user2Ref.id, member_no: 'MH-0002', full_name: 'Ana dos Santos',
    bi_electoral_no: 'BI-002345', date_of_birth: '1995-07-22', place_of_birth: 'Baucau',
    profession: 'Enfermeira', address: 'Rua Formosa, Dili', phone: '+67077200002',
    email: 'ana.santos@email.com', member_type: 'employee', photo_url: null,
    joined_date: '2024-02-01', status: 'active', created_at: now
  });

  const m3Ref = db.collection('members').doc();
  await m3Ref.set({
    user_id: user3Ref.id, member_no: 'MH-0003', full_name: 'João da Costa',
    bi_electoral_no: 'BI-003456', date_of_birth: '2000-11-10', place_of_birth: 'Liquiçá',
    profession: 'Estudante Universidade', address: 'Rua de Lecidere, Dili', phone: '+67077300003',
    email: 'joao.costa@email.com', member_type: 'student', photo_url: null,
    joined_date: '2024-03-10', status: 'active', created_at: now
  });

  console.log('  ✅ Members created');

  // Savings for MH-0001
  const savingsDates = ['2024-01-15', '2024-02-15', '2024-03-15', '2024-04-15',
    '2024-05-15', '2024-06-15', '2024-07-15', '2024-08-15'];
  let balance1 = 0;
  for (const date of savingsDates) {
    balance1 += 10;
    await db.collection('savings').add({ member_id: m1Ref.id, amount: 10, type: 'mandatory', description: 'Kontribuisaun mandatóriu fulan-fulan', transaction_date: date, balance_after: balance1, created_by: adminRef.id, created_at: now });
  }
  balance1 += 30;
  await db.collection('savings').add({ member_id: m1Ref.id, amount: 30, type: 'voluntary', description: 'Poupansa voluntáriu', transaction_date: '2024-04-20', balance_after: balance1, created_by: adminRef.id, created_at: now });
  balance1 += 15;
  await db.collection('savings').add({ member_id: m1Ref.id, amount: 15, type: 'dividend', description: 'Funan tinan 2023', transaction_date: '2024-06-30', balance_after: balance1, created_by: adminRef.id, created_at: now });

  // Savings for MH-0002
  let balance2 = 0;
  for (const date of savingsDates.slice(1)) {
    balance2 += 10;
    await db.collection('savings').add({ member_id: m2Ref.id, amount: 10, type: 'mandatory', description: 'Kontribuisaun mandatóriu fulan-fulan', transaction_date: date, balance_after: balance2, created_by: adminRef.id, created_at: now });
  }
  balance2 += 20;
  await db.collection('savings').add({ member_id: m2Ref.id, amount: 20, type: 'voluntary', description: 'Poupansa voluntáriu', transaction_date: '2024-05-10', balance_after: balance2, created_by: adminRef.id, created_at: now });

  // Savings for MH-0003 (student, $2/month)
  let balance3 = 0;
  for (const date of savingsDates.slice(2)) {
    balance3 += 2;
    await db.collection('savings').add({ member_id: m3Ref.id, amount: 2, type: 'mandatory', description: 'Kontribuisaun mandatóriu estudante', transaction_date: date, balance_after: balance3, created_by: adminRef.id, created_at: now });
  }

  console.log('  ✅ Savings created');

  // Loan for MH-0001
  const loanRef = db.collection('loans').doc();
  await loanRef.set({
    loan_ref: 'LN-2024-001', member_id: m1Ref.id, full_name: 'Mário da Silva',
    member_no: 'MH-0001', phone: '+67077100001',
    amount: 300, purpose: 'Sosa ekipamentu eskola ba labarik sira', duration_months: 6,
    interest_rate: 7, monthly_payment: 51.14, total_repayment: 306.84,
    collateral: 'Sertifikadu servisu', guarantor_name: 'Ana dos Santos', guarantor_phone: '+67077200002',
    status: 'active', applied_date: '2024-04-01', approved_date: '2024-04-03',
    approved_by: adminRef.id, approved_by_name: 'admin', notes: 'Aprova ho susesu', created_at: now
  });

  // Repayments for loan 1 (3 months paid)
  const repaySchedule = [
    { month_number: 1, amount_paid: 51.14, principal: 47.39, interest: 3.75, balance: 252.61, paid_date: '2024-05-03' },
    { month_number: 2, amount_paid: 51.14, principal: 47.98, interest: 3.16, balance: 204.63, paid_date: '2024-06-03' },
    { month_number: 3, amount_paid: 51.14, principal: 48.58, interest: 2.56, balance: 156.05, paid_date: '2024-07-03' },
  ];
  for (const r of repaySchedule) {
    await db.collection('loan_repayments').add({ loan_id: loanRef.id, ...r, created_at: now });
  }

  // Pending loan for MH-0002
  await db.collection('loans').add({
    loan_ref: 'LN-2024-002', member_id: m2Ref.id, full_name: 'Ana dos Santos',
    member_no: 'MH-0002', phone: '+67077200002',
    amount: 500, purpose: 'Reparasaun uma', duration_months: 12,
    interest_rate: 7, monthly_payment: 43.47, total_repayment: 521.64,
    collateral: null, guarantor_name: 'Mário da Silva', guarantor_phone: '+67077100001',
    status: 'pending', applied_date: '2024-08-15', approved_date: null,
    approved_by: null, approved_by_name: null, notes: null, created_at: now
  });

  console.log('  ✅ Loans created');

  // Investor
  await db.collection('investors').add({
    investor_no: 'MH-IN-001', full_name: 'Carlos Mendes',
    bi_electoral_no: 'BI-999001', phone: '+67077500001',
    email: 'carlos.mendes@email.com', investor_type: 'non-member',
    member_id: null, member_name: null, member_no: null,
    amount: 5000, start_date: '2024-01-01', end_date: '2025-01-01',
    frequency: 'one-time', status: 'active', registration_fee: 5.00, created_at: now
  });

  console.log('  ✅ Investors created');
  console.log('\n✅ Firestore seeded successfully!');
  console.log('\nLogin credentials:');
  console.log('  President: president / president123');
  console.log('  Admin:     admin / admin123');
  console.log('  Members:   mario.silva, ana.santos, joao.costa / member123');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
