'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/investors', require('./routes/investors'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/news', require('./routes/news'));

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', app: 'KMH Backend', version: '2.0.0', db: 'firestore' })
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erru iha servidor' });
});

module.exports = app;
