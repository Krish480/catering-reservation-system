const express = require('express');
const router = express.Router();
const path = require("path");
const fs = require("fs").promises;

const { auth } = require('../config/firebase');
const {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} = require('firebase/auth');

// --- File path for persistent user info ---
const USERS_FILE = path.join(__dirname, "..", "public", "data", "users.json");

// Helpers
async function loadUsers() {
  try {
    const txt = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(txt || "[]");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

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

    // --- Save to users.json ---
    let users = await loadUsers();
    if (!users.find(u => u.email === email)) {
      users.push({
        email,
        name: name || '',
        phone: '',
        address: '',
        gender: '',
        avatar: '/images/avatars/default.jpg',
        cart: []
      });
      await saveUsers(users);
    }

    // ✅ Force save session before redirect/render
    req.session.save(err => {
      if (err) console.error("Session save error:", err);
      return res.render("pages/register", {
        success: "🎉 Account created successfully! Redirecting to homepage...",
        error: null
      });
    });

  } catch (err) {
    console.error("Register error:", err.message, err.code);
    let errMSG = "⚠️ Something went wrong!";
    if (err.code === "auth/email-already-in-use") {
      errMSG = "⚠️ This email is already registered. Please login instead.";
    } else if (err.code === "auth/weak-password") {
      errMSG = "⚠️ Password is too weak. Use at least 6 characters.";
    }
    return res.render("pages/register", {
      error: errMSG,
      success: null
    });
  }
});

// POST login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // load user profile from users.json
    let users = await loadUsers();
    const u = users.find(x => x.email === email);

    req.session.user = {
      id: userCredential.user.uid,
      email: userCredential.user.email,
      name: u ? u.name : '',
      phone: u ? u.phone : '',
      address: u ? u.address : '',
      gender: u ? u.gender : '',
      avatar: u ? u.avatar : '/images/avatars/default.jpg',
      cart: u ? u.cart || [] : []
    };

    // ✅ Save session
    req.session.save(err => {
      if (err) console.error("Session save error:", err);
      return res.render("pages/login", {
        success: "✅ Login successful! Redirecting to homepage...",
        error: null
      });
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
    try { await signOut(auth); } catch (e) { /* ignore */ }
    req.session.destroy(() => res.redirect('/login'));
  } catch (err) {
    console.error("Logout error:", err.message);
    res.redirect('/');
  }
});

module.exports = router;
