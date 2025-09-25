const express = require("express");
const app = express();
const path = require("path");
const port = 8080;
const { v4: uuidv4 } = require("uuid");
const session = require("express-session");
const fs = require("fs").promises;
require("dotenv").config();

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
      maxAge: 1000 * 60 * 60 * 24, // 1 day
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

// ================= Profile =================
const multer = require("multer");
const fsSync = require("fs");
const AVATAR_DIR = path.join(__dirname, "public", "images", "avatars");

// ensure avatar dir exists
if (!fsSync.existsSync(AVATAR_DIR)) fsSync.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

// Profile (protected)
app.get("/profile", ensureAuth, (req, res) => {
  res.render("pages/profile", { user: req.session.user });
});

// update profile (supports avatar upload OR avatarUrl OR preset)
app.post("/profile", ensureAuth, avatarUpload.single("avatarFile"), async (req, res) => {
  try {
    const { name, address, gender, phone, avatarUrl, avatarPreset } = req.body;
    const email = req.session.user.email;

    // load all users
    let users = await loadUsers();
    let u = users.find((x) => x.email === email);
    if (!u) {
      u = { email };
      users.push(u);
    }

    // update fields
    u.name = name || u.name || "";
    u.address = address || u.address || "";
    u.gender = gender || u.gender || "";
    u.phone = phone || u.phone || "";

    // avatar handling
    if (req.file) {
      u.avatar = `/images/avatars/${req.file.filename}`;
    } else if (avatarPreset) {
      u.avatar = avatarPreset;
    } else if (avatarUrl && avatarUrl.trim()) {
      u.avatar = avatarUrl.trim();
    }

    // save users.json
    await saveUsers(users);

    // update session too
    req.session.user = u;

    res.redirect("/profile?updated=1");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("Failed to update profile");
  }
});

// ================= Orders =================
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

// ================= Menu & Products =================
app.get("/menu", (req, res) => {
  res.render("pages/menu");
});

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

// ================= Misc Pages =================
app.get("/cart", (req, res) => res.render("pages/cart"));
app.get("/about", (req, res) => res.render("pages/about"));
app.get("/services", (req, res) => res.render("pages/services"));
app.get("/contact", (req, res) => res.render("pages/contact"));

// ================= Auth Routes =================
app.use("/auth", authRouter);

app.get("/login", (req, res) => res.redirect("/auth/login"));
app.get("/register", (req, res) => res.redirect("/auth/register"));

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ================= Admin Routes =================
app.use("/admin", adminRoutes);

// ================= Server Start =================
app.listen(port, () => {
  console.log(`🚀 App is listening on port ${port}`);
});

// ================= Orders Save =================
app.post("/order", async (req, res) => {
  try {
    const cartData = JSON.parse(req.body.cartData || "[]");
    if (!cartData.length) return res.send("Cart is empty!");

    let orders = [];
    try {
      const txt = await fs.readFile(ORDERS_FILE, "utf-8");
      orders = JSON.parse(txt || "[]");
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    // 🟢 user profile info from session
    const user = req.session.user || {};
    
    const newOrder = {
      id: uuidv4(),
      customer: {
        name: user.name || "Guest",
        email: user.email || "—",
        phone: user.phone || "—"
      },
      address: user.address || "—",
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

// =================== Users Data ==================
const USERS_FILE = path.join(__dirname, "public", "data", "users.json");

// helper: load users
async function loadUsers() {
  try {
    const txt = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(txt || "[]");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// helper: save users
async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}
