// server.js
const express = require("express");
const app = express();
const port = 8080;
const path = require("path");
require("dotenv").config();
const session = require("express-session");




// Routers
const authRouter = require("./routes/auth");
const adminRoutes = require("./routes/admin");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "Krishnapandey$638",
    resave: false,
    saveUninitialized: false,
  })
);

// expose session to EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Make user available in all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});



// Home
app.get("/", (req, res) => {
  res.render("pages/index", { title: "MealMatrix", });
});

// ensureAuth usage on protected routes (example)
const { ensureAuth } = require('./middlewares/auth');
app.get('/profile', ensureAuth, (req, res) => res.render('pages/profile', { user: req.session.user }));

app.get('/orders', ensureAuth, (req, res) => {
  res.render('pages/orders');
});

// Menu
app.get("/menu", (req, res) => {
  res.render("pages/menu");
});

// Cart
app.get("/cart", (req, res) => {
  res.render("pages/cart");
});

// About
app.get("/about", (req, res) => {
  res.render("pages/about");
});

// Services
app.get("/services", (req, res) => {
  res.render("pages/services");
});

// Contact
app.get("/contact", (req, res) => {
  res.render("pages/contact");
});

// Auth routes
app.use("/auth", authRouter);

//login
app.get("/login", (req, res) => res.redirect("/auth/login"));

// register
app.get("/register", (req, res) => res.redirect("/auth/register"));


//logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});




// Admin Credentials (sirf server-side safe)
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASS = "admin123";

// Render admin login page
app.get("/admin-login", (req, res) => {
  res.render("pages/admin-login", { title: "Admin Login" });
});

// Handle admin login form submit
app.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    res.redirect("/admin"); // Success
  } else {
    res.send("❌ Invalid credentials, try again.");
  }
});

// Admin Dashboard Page
app.get("/admin", (req, res) => {
  res.render("pages/admin", { title: "Admin Dashboard" });
});

// Import and use Admin routes (upload, orders, etc.)
app.use("/admin", adminRoutes);

// Server Start
app.listen(port, () => {
  console.log(`🚀 App is listening on port ${port}`);
});
