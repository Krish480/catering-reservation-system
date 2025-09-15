const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
const { getAuth } = require("firebase/auth");
// Firebase config 
const firebaseConfig = {
  apiKey: "AIzaSyAX_mqo76e7rTTYJDPJ1djUboGGxENvjow",
  authDomain: "catering-system-904a2.firebaseapp.com",
  projectId: "catering-system-904a2",
  storageBucket: "catering-system-904a2.firebasestorage.app",
  messagingSenderId: "237268631141",
  appId: "1:237268631141:web:4c10d6c99d1d4c9b53108c"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { db, auth };
