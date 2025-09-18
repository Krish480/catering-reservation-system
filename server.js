// server.js
const express = require("express");
const app = express();
const port = 8080;
const path = require("path");
const fs = require("fs");
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


// ----------------- Routes -----------------

// Home
app.get("/", (req, res) => {
  res.render("pages/index", { title: "MealMatrix" });
});

// Auth middleware
const { ensureAuth } = require("./middlewares/auth");

// Profile (protected)
app.get("/profile", ensureAuth, (req, res) =>
  res.render("pages/profile", { user: req.session.user })
);

// Orders (protected)
app.get("/orders", ensureAuth, (req, res) => {
  res.render("pages/orders");
});

// Menu
app.get("/menu", (req, res) => {
  res.render("pages/menu");
});

// Product (dynamic by id from menu.json)
app.get("/product", (req, res) => {
  const id = req.query.id;

  try {
    const menuData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data/menu.json"), "utf-8")
    );

    const product = menuData.find((p) => String(p.id) === String(id));

    res.render("pages/product", { product });
  } catch (err) {
    console.error("Error reading menu.json:", err);
    res.render("pages/product", { product: null });
  }
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

// login redirect
app.get("/login", (req, res) => res.redirect("/auth/login"));

// register redirect
app.get("/register", (req, res) => res.redirect("/auth/register"));

// logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ----------------- Admin Routes -----------------
app.use("/admin", adminRoutes);

// ----------------- Server Start -----------------
app.listen(port, () => {
  console.log(`🚀 App is listening on port ${port}`);
});
