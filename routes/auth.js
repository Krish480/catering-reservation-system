const express = require('express');
const router = express.Router();
const { auth } = require('../config/firebase');
const {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} = require('firebase/auth');

// GET login
router.get('/login', (req, res) => {
  res.render('pages/login', { error: null, success: null });
});

// GET register
router.get('/register', (req, res) => {
  res.render('pages/register', { error: null, success: null });
});

// POST register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // minimal session info
    req.session.user = {
      id: userCredential.user.uid,
      email: userCredential.user.email,
      name: name || ''
    };

    // Success → show message & redirect from frontend
    return res.render("pages/register", {
      success: "🎉 Account created successfully! Redirecting to homepage...",
      error: null
    });

  } catch (err) {
    console.error("Register error:", err.message);
    return res.render("pages/register", {
      error: err.message,
      success: null
    });
  }
});

// POST login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    req.session.user = {
      id: userCredential.user.uid,
      email: userCredential.user.email
    };

    // Success → show message & redirect from frontend
    return res.render("pages/login", {
      success: "✅ Login successful! Redirecting to homepage...",
      error: null
    });

  } catch (err) {
    console.error("Login error:", err.message);
    return res.render("pages/login", {
      error: "❌ Invalid username or password",
      success: null
    });
  }
});

// GET logout
router.get('/logout', async (req, res) => {
  try {
    try { await signOut(auth); } catch(e) { /* ignore */ }
    req.session.destroy(() => res.redirect('/login'));
  } catch (err) {
    console.error("Logout error:", err.message);
    res.redirect('/');
  }
});

module.exports = router;
