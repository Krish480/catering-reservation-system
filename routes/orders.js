// routes/orders.js

const express = require('express');
const router = express.Router();

// Assumption: Firebase is setup and orders are stored under some collection, e.g. "orders"
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const { db } = require('../firebase');  // ya jo firebase.js me export kiya hai

// Middleware to check auth user; if you have authentication logic
const { ensureAuth } = require('./auth');  

// Route: GET /orders
router.get('/', ensureAuth, async (req, res) => {
  try {
    // user id from session/auth
    const userId = req.user.id;  // ya jo property use karte ho

    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.render('orders', { orders });  // views/orders.ejs
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.render('orders', { orders: [], error: "Could not load orders" });
  }
});

module.exports = router;
