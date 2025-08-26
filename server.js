const express = require("express")
const app = express();
const port = 8080;
const path = require("path");
const { title } = require("process");

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAX_mqo76e7rTTYJDPJ1djUboGGxENvjow",
  authDomain: "catering-system-904a2.firebaseapp.com",
  projectId: "catering-system-904a2",
  storageBucket: "catering-system-904a2.firebasestorage.app",
  messagingSenderId: "237268631141",
  appId: "1:237268631141:web:4c10d6c99d1d4c9b53108c"
};


// Database
const db = require("./firebase");


// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}))

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"))

// Static files
app.use(express.static(path.join(__dirname,"public")));

// Routes
app.get("/", (req,res) => {
    res.render("pages/index", {title: "MealMatrix"})
})

// Menu
app.get("/menu", (req, res) => {
  res.render("pages/menu");
});

// 🔹 Admin Credentials (sirf server-side safe)
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASS = "admin123";

// Render login page
app.get("/admin-login", (req, res) => {
  res.render("pages/admin-login");
});

// Handle login form submit
app.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    res.redirect("/admin"); // ✅ Success
  } else {
    res.send("❌ Invalid credentials, try again.");
  }
});

// Admin Dashboard Page
app.get("/admin", (req, res) => {
  res.render("pages/admin");
});

// Server Start
app.listen(port, () => {
    console.log(`App is listening on port ${port}`)
})