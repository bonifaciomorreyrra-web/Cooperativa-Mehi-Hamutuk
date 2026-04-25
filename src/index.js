'use strict';
// Local dev server — not used in Cloud Functions deployment
const app = require('./app');
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 KMH Backend running on http://localhost:${PORT}`);
  console.log('   DB: Firestore');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
