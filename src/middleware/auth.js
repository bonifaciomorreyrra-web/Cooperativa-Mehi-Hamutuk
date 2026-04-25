'use strict';
const jwt = require('jsonwebtoken');
const { getById } = require('../db/firestore');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Token ne'ebé la iha ka la válidu" });
    }
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await getById('users', decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Token la válidu' });
    }
    req.user = { id: decoded.id, ...user };
    next();
  } catch {
    res.status(401).json({ error: 'Token la válidu ka hotu ona' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Laiha permisaun ba aktu ida ne'e" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
