// server.js
const express = require("express");
const app = express();
const port = 8080;
const path = require("path");
require("dotenv").config();
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
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
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, 
      secure: false,               
      httpOnly: true
    }
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

// ----------------- Orders (protected) -----------------
const ORDERS_FILE = path.join(__dirname, "public", "data", "orders.json");

app.get("/orders", ensureAuth, async (req, res) => {
  try {
    const txt = await fs.readFile(ORDERS_FILE, "utf-8");
    const orders = JSON.parse(txt || "[]");

    // filter current user ke orders
    const userOrders = orders.filter(
      (o) => o.user === (req.session.user ? req.session.user.name : "Guest")
    );

    res.render("pages/orders", { orders: userOrders });
  } catch (err) {
    console.error("Error loading orders:", err);
    res.render("pages/orders", { orders: [] });
  }
});

// Menu
app.get("/menu", (req, res) => {
  res.render("pages/menu");
});

// Product (dynamic by id from menu.json)
app.get("/product/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const menuData = JSON.parse(
      await fs.readFile(path.join(__dirname, "public", "data", "menu.json"), "utf-8")
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

// ----------------- For-Orders Save -----------------
app.post("/order", async (req, res) => {
  try {
    const cartData = JSON.parse(req.body.cartData || "[]");
    if (!cartData.length) return res.send("Cart is empty!");

    // orders.json load
    let orders = [];
    try {
      const txt = await fs.readFile(ORDERS_FILE, "utf-8");
      orders = JSON.parse(txt || "[]");
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    const newOrder = {
      id: uuidv4(),
      user: req.session.user ? req.session.user.name : "Guest",
      items: cartData,
      total: cartData.reduce((s, i) => s + i.price * (i.quantity || 1), 0),
      status: "Pending",
      history: [{ status: "Pending", time: new Date().toISOString() }],
    };

    orders.unshift(newOrder);
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");

    res.render("pages/order-success", { order: newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong!");
  }
});
