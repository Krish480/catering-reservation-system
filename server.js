const express = require("express");
const app = express();
const path = require("path");
const port = 8080;
const { v4: uuidv4 } = require("uuid");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
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
    store: new FileStore({}),
    secret: process.env.SESSION_SECRET || "Krishnapandey$638",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
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

// user available in all EJS templates
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
app.get("/profile", ensureAuth, async (req, res) => {
  const users = await loadUsers();
  const u = users.find(x => x.email === req.session.user.email);
  res.render("pages/profile", { user: u || req.session.user });
});

app.post("/profile", ensureAuth, avatarUpload.single("avatarFile"), async (req, res) => {
  try {
    const { name, address, gender, phone, avatarUrl, avatarPreset } = req.body;
    const email = req.session.user.email;

    // Load users
    let users = await loadUsers();
    let u = users.find(user => user.email === email);
    if (!u) {
      u = { email };
      users.push(u);
    }

    // Update basic info
    u.name = name?.trim() || u.name || "";
    u.address = address?.trim() || u.address || "";
    u.gender = gender || u.gender || "";
    u.phone = phone?.trim() || u.phone || "";

    // Handle avatar selection
    if (req.file) {
      u.avatar = `/images/avatars/${req.file.filename}`;
    } else if (avatarPreset) {
      u.avatar = avatarPreset;
    } else if (avatarUrl?.trim()) {
      u.avatar = avatarUrl.trim();
    }

    // Save updated users.json
    await saveUsers(users);

    // Sync session
    req.session.user = { ...u };
    await new Promise(r => req.session.save(r));

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

    // filter orders by session user email
    const userOrders = orders.filter(
      (o) => o.customer && o.customer.email === req.session.user.email
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

    //  user profile info from session
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

// ================ Cart APIs ==============
app.get('/cart/data', ensureAuth, async (req, res) => {
  const users = await loadUsers();
  let user = users.find(u => u.email === req.session.user.email);
  if (!user) {
    // agar user exist nahi karta to initialize
    user = { email: req.session.user.email, cart: [] };
    users.push(user);
    await saveUsers(users);
  }
  res.json({
    cart: user.cart || [],
    cartCount: (user.cart || []).reduce((s, i) => s + (i.quantity || 1), 0)
  });
});

// Add item to cart
app.post('/cart/add', ensureAuth, async (req, res) => {
  const users = await loadUsers();
  const user = users.find(u => u.email === req.session.user.email);
  if (!user.cart) user.cart = [];

  const item = req.body.item;
  if (!item || !item.id) return res.status(400).json({ success: false, msg: "Invalid item" });

  const exist = user.cart.find(x => x.id === item.id);
  if (exist) exist.quantity = (exist.quantity || 1) + 1;
  else user.cart.push({ ...item, quantity: 1 });

  await saveUsers(users);
  res.json({ success: true, cartCount: user.cart.reduce((s, i) => s + (i.quantity || 1), 0) });
});

// Update quantity
app.post('/cart/update', ensureAuth, async (req, res) => {
  const { id, delta } = req.body;
  const users = await loadUsers();
  const user = users.find(u => u.email === req.session.user.email);
  if (!user.cart) user.cart = [];

  const item = user.cart.find(x => x.id === id);
  if (item) {
    item.quantity = (item.quantity || 1) + delta;
    if (item.quantity <= 0) user.cart = user.cart.filter(x => x.id !== id);
  }

  await saveUsers(users);
  res.json({ success: true, cartCount: user.cart.reduce((s, i) => s + (i.quantity || 1), 0) });
});

// Remove item
app.post('/cart/remove', ensureAuth, async (req, res) => {
  const { id } = req.body;
  const users = await loadUsers();
  const user = users.find(u => u.email === req.session.user.email);
  if (!user.cart) user.cart = [];

  user.cart = user.cart.filter(x => x.id !== id);

  await saveUsers(users);
  res.json({ success: true, cartCount: user.cart.reduce((s, i) => s + (i.quantity || 1), 0) });
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
