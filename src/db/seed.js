require('dotenv').config();
const bcrypt = require('bcryptjs');

async function seed() {
  const { getDB } = require('./init');
  const db = await getDB();

  // Users
  const users = [
    { username: 'president', password: 'president123', role: 'president' },
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'mario.silva', password: 'member123', role: 'member' },
    { username: 'ana.santos', password: 'member123', role: 'member' },
    { username: 'joao.costa', password: 'member123', role: 'member' },
  ];

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    insertUser.run(u.username, hash, u.role);
  }

  const presidentUser = db.prepare("SELECT id FROM users WHERE username='president'").get();
  const adminUser = db.prepare("SELECT id FROM users WHERE username='admin'").get();
  const marioUser = db.prepare("SELECT id FROM users WHERE username='mario.silva'").get();
  const anaUser = db.prepare("SELECT id FROM users WHERE username='ana.santos'").get();
  const joaoUser = db.prepare("SELECT id FROM users WHERE username='joao.costa'").get();

  // Members
  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO members
    (user_id, member_no, full_name, bi_electoral_no, date_of_birth, place_of_birth,
     profession, address, phone, email, member_type, joined_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMember.run(presidentUser.id, 'MH-0001', 'Presidente KMH', '1234567', '1975-05-10', 'Dili', 'President', 'Dili, Timor-Leste', '+670 7720 0001', 'president@kmh.tl', 'employee', '2018-01-01', 'active');
  insertMember.run(adminUser.id, 'MH-0002', 'Koordinador Kreditu', '2345678', '1980-03-15', 'Baucau', 'Credit Coordinator', 'Dili, Timor-Leste', '+670 7720 0002', 'admin@kmh.tl', 'employee', '2018-01-01', 'active');
  insertMember.run(marioUser.id, 'MH-0003', 'Mário da Silva', '3456789', '1990-07-22', 'Dili', 'Teacher', 'Comoro, Dili', '+670 7730 1001', 'mario@email.com', 'employee', '2020-03-01', 'active');
  insertMember.run(anaUser.id, 'MH-0004', 'Ana Santos', '4567890', '1995-11-30', 'Ermera', 'Nurse', 'Farol, Dili', '+670 7730 1002', 'ana@email.com', 'employee', '2020-06-15', 'active');
  insertMember.run(joaoUser.id, 'MH-0005', 'João Costa', '5678901', '1998-02-14', 'Liquiçá', 'Student', 'Becora, Dili', '+670 7730 1003', 'joao@email.com', 'student', '2021-01-10', 'active');

  const mario = db.prepare("SELECT id FROM members WHERE member_no='MH-0003'").get();
  const ana = db.prepare("SELECT id FROM members WHERE member_no='MH-0004'").get();
  const joao = db.prepare("SELECT id FROM members WHERE member_no='MH-0005'").get();

  // Savings
  const insertSavings = db.prepare(`
    INSERT OR IGNORE INTO savings (member_id, amount, type, description, transaction_date, balance_after, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const savingsData = [
    [mario.id, 10.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Jan 2024', '2024-01-05', 10.00, adminUser.id],
    [mario.id, 10.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Feb 2024', '2024-02-05', 20.00, adminUser.id],
    [mario.id, 50.00, 'voluntary', 'Poupansa Voluntáriu', '2024-02-10', 70.00, adminUser.id],
    [mario.id, 10.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Mar 2024', '2024-03-05', 80.00, adminUser.id],
    [mario.id, 10.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Apr 2024', '2024-04-05', 90.00, adminUser.id],
    [mario.id, 25.00, 'dividend', 'Funan Tinan 2023', '2024-01-15', 115.00, adminUser.id],
    [ana.id, 10.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Jan 2024', '2024-01-05', 10.00, adminUser.id],
    [ana.id, 10.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Feb 2024', '2024-02-05', 20.00, adminUser.id],
    [ana.id, 10.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Mar 2024', '2024-03-05', 30.00, adminUser.id],
    [joao.id, 2.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Jan 2024', '2024-01-05', 2.00, adminUser.id],
    [joao.id, 2.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Feb 2024', '2024-02-05', 4.00, adminUser.id],
    [joao.id, 2.00, 'mandatory', 'Kontribuisaun Obrigatóriu - Mar 2024', '2024-03-05', 6.00, adminUser.id],
  ];
  for (const s of savingsData) insertSavings.run(...s);

  // Loans
  const insertLoan = db.prepare(`
    INSERT OR IGNORE INTO loans
    (loan_ref, member_id, amount, purpose, duration_months, interest_rate,
     monthly_payment, total_repayment, collateral, guarantor_name, guarantor_phone,
     status, applied_date, approved_date, approved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLoan.run('LN-2024-001', mario.id, 300.00, 'Sosa ekipamentu ensinu', 6, 7.00, 51.75, 310.50, 'Mota sira', 'Pedro Sousa', '+670 7740 2001', 'completed', '2024-01-10', '2024-01-12', adminUser.id);
  insertLoan.run('LN-2024-002', ana.id, 500.00, 'Despeza médiku', 12, 7.00, 43.54, 522.48, 'Dokumentu uma', 'Maria Lopes', '+670 7740 2002', 'active', '2024-02-01', '2024-02-03', adminUser.id);
  insertLoan.run('LN-2024-003', mario.id, 400.00, 'Negósiu ki\'ik', 8, 7.00, 51.75, 414.00, 'Mota', 'Carlos Belo', '+670 7740 2003', 'pending', '2024-04-15', null, null);

  // Repayments for LN-2024-002
  const insertRepayment = db.prepare(`
    INSERT OR IGNORE INTO loan_repayments
    (loan_id, month_number, amount_paid, principal, interest, balance, paid_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const anaLoan = db.prepare("SELECT id FROM loans WHERE loan_ref='LN-2024-002'").get();
  if (anaLoan) {
    insertRepayment.run(anaLoan.id, 1, 43.54, 40.62, 2.92, 459.38, '2024-03-05');
    insertRepayment.run(anaLoan.id, 2, 43.54, 40.86, 2.68, 418.52, '2024-04-05');
  }

  // Investors
  const insertInvestor = db.prepare(`
    INSERT OR IGNORE INTO investors
    (investor_no, full_name, bi_electoral_no, phone, email, investor_type,
     member_id, amount, start_date, end_date, frequency, status, registration_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertInvestor.run('MH-IN-001', 'Carlos Mendonça', '6789012', '+670 7750 3001', 'carlos@email.com', 'non-member', null, 3000.00, '2023-06-01', '2024-06-01', 'one-time', 'active', 5.00);
  insertInvestor.run('MH-IN-002', 'Mário da Silva', '3456789', '+670 7730 1001', 'mario@email.com', 'member', mario.id, 500.00, '2023-01-01', '2024-01-01', 'one-time', 'completed', 5.00);

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('  President : username=president, password=president123');
  console.log('  Admin     : username=admin,     password=admin123');
  console.log('  Member 1  : username=mario.silva, password=member123');
  console.log('  Member 2  : username=ana.santos,  password=member123');
  console.log('  Member 3  : username=joao.costa,  password=member123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
