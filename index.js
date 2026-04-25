'use strict';
// Firebase Cloud Functions entry point
require('dotenv').config({ path: '.env.local' });
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const app = require('./src/app');

setGlobalOptions({ region: 'asia-southeast1', memory: '512MiB' });

exports.api = onRequest({ invoker: 'public' }, app);
