'use strict';
const admin = require('firebase-admin');

let _db;

function getDB() {
  if (!_db) {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Render.com / any host: pass service account as base64-encoded JSON env var
        const serviceAccount = JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
      } else {
        // Local dev: uses GOOGLE_APPLICATION_CREDENTIALS file path
        // Cloud Functions: uses Application Default Credentials automatically
        admin.initializeApp({
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
      }
    }
    _db = admin.firestore();
  }
  return _db;
}

async function getById(col, id) {
  const doc = await getDB().collection(col).doc(String(id)).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function findOne(col, conditions) {
  let ref = getDB().collection(col);
  for (const [f, op, v] of conditions) ref = ref.where(f, op, v);
  const snap = await ref.limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

async function findAll(col, conditions = [], orderByField = null, desc = false) {
  let ref = getDB().collection(col);
  for (const [f, op, v] of conditions) ref = ref.where(f, op, v);
  if (orderByField) ref = ref.orderBy(orderByField, desc ? 'desc' : 'asc');
  const snap = await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function add(col, data) {
  const ref = await getDB().collection(col).add({ ...data, created_at: new Date().toISOString() });
  return ref.id;
}

async function set(col, id, data) {
  await getDB().collection(col).doc(String(id)).set({ ...data, created_at: new Date().toISOString() });
  return String(id);
}

async function update(col, id, data) {
  await getDB().collection(col).doc(String(id)).update(data);
}

async function remove(col, id) {
  await getDB().collection(col).doc(String(id)).delete();
}

async function nextCounter(field) {
  const db = getDB();
  const ref = db.collection('counters').doc('main');
  let next;
  await db.runTransaction(async t => {
    const doc = await t.get(ref);
    next = ((doc.exists && doc.data()[field]) || 0) + 1;
    t.set(ref, { [field]: next }, { merge: true });
  });
  return next;
}

module.exports = { getDB, getById, findOne, findAll, add, set, update, remove, nextCounter };
