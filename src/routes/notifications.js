'use strict';
const express = require('express');
const { add, findAll } = require('../db/firestore');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin', 'president'));

const SMS_TEMPLATES = {
  loan_approved: (ref, amount) =>
    `Ita-nia pedidu imprestimu ${ref} aprova ona. Montante: $${amount}. Kontaktu KMH ba informasaun seluk. Obrigadu!`,
  loan_rejected: (ref) =>
    `Ita-nia pedidu imprestimu ${ref} la aprova. Kontaktu KMH administrasaun. Obrigadu!`,
  payment_reminder: (month, amount, date) =>
    `Lembransa: Ita-nia kontribuisaun fulan ${month} $${amount} sei tama data ${date}. Obrigadu! - KMH`,
  dividend: (amount) =>
    `Parabéns! Ita-nia funan tinan nian $${amount} kredita tiha ona ba ita-nia konta. - KMH`
};

async function sendSMS(phone, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  if (sid?.startsWith('AC')) {
    const twilio = require('twilio')(sid, process.env.TWILIO_AUTH_TOKEN);
    const result = await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    return { success: true, sid: result.sid };
  }
  console.log(`[SMS MOCK] To: ${phone} | ${message}`);
  return { success: true, sid: `MOCK_${Date.now()}` };
}

async function sendEmail(email, subject, message) {
  if (process.env.SMTP_USER) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: `"KMH Kooperativa" <${process.env.SMTP_USER}>`,
      to: email, subject, text: message,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#3a3abf;color:#fff;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Cooperativa Mehi Hamutuk</h2>
          <p style="margin:4px 0 0;opacity:.8">Dili, Timor-Leste</p>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p style="white-space:pre-line">${message}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
          <p style="color:#6b7280;font-size:12px">Kooperativa Mehi Hamutuk · cooperativa.mh@gmail.com</p>
        </div>
      </div>`
    });
    return { success: true };
  }
  console.log(`[EMAIL MOCK] To: ${email} | Subject: ${subject} | ${message}`);
  return { success: true };
}

router.post('/sms', async (req, res) => {
  const { member_id, phone, message, template, template_params } = req.body;
  const finalMessage = template
    ? SMS_TEMPLATES[template]?.(...(template_params || [])) || message
    : message;
  if (!finalMessage || !phone) return res.status(400).json({ error: 'Telefone no mensajen obrigatóriu' });

  let status = 'failed';
  try {
    await sendSMS(phone, finalMessage);
    status = 'sent';
  } catch (err) {
    console.error('SMS error:', err.message);
  }

  const id = await add('notifications', {
    member_id: member_id || null, type: 'sms', message: finalMessage,
    phone, email: null, status, sent_at: new Date().toISOString()
  });
  res.json({ id, status, message: finalMessage });
});

router.post('/email', async (req, res) => {
  const { member_id, email, subject = 'KMH Notifikasaun', message } = req.body;
  if (!email || !message) return res.status(400).json({ error: 'Email no mensajen obrigatóriu' });

  let status = 'failed';
  try {
    await sendEmail(email, subject, message);
    status = 'sent';
  } catch (err) {
    console.error('Email error:', err.message);
  }

  const id = await add('notifications', {
    member_id: member_id || null, type: 'email', message,
    phone: null, email, status, sent_at: new Date().toISOString()
  });
  res.json({ id, status });
});

router.get('/:memberId', async (req, res) => {
  try {
    const notifications = await findAll('notifications', [['member_id', '==', req.params.memberId]], 'sent_at', true);
    res.json(notifications.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

module.exports = router;
