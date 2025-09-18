// routes/admin.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { ensureAdmin } = require('../middlewares/adminAuth');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'images', 'products');

// ensure upload dir exists (on runtime)
const fsSync = require('fs');
if (!fsSync.existsSync(UPLOAD_DIR)) fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

// helpers
async function readJson(filePath) {
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(filePath, '[]', 'utf8');
      return [];
    }
    throw err;
  }
}
async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/* ---------- admin login ---------- */
// GET login
router.get('/login', (req, res) => {
  res.render('pages/admin-login', { error: null });
});

// POST login
router.post('/login', (req, res) => {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    req.session.admin = { email };
    return res.redirect('/admin/dashboard');
  }
  res.render('pages/admin-login', { error: 'Invalid credentials' });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

/* ---------- dashboard ---------- */
router.get('/dashboard', ensureAdmin, async (req, res) => {
  const products = await readJson(MENU_FILE);
  const orders = await readJson(ORDERS_FILE);
  res.render('pages/admin-dashboard', {
    productsCount: products.length,
    ordersCount: orders.length
  });
});

/* ---------- product management ---------- */
// list
router.get('/products', ensureAdmin, async (req, res) => {
  const products = await readJson(MENU_FILE);
  res.render('pages/admin-products', { products });
});

// new form
router.get('/products/new', ensureAdmin, (req, res) => {
  res.render('pages/admin-product-form', { product: null, action: '/admin/products' });
});

// create
router.post('/products', ensureAdmin, upload.single('image'), async (req, res) => {
  const products = await readJson(MENU_FILE);
  const { name, price, description, category, offer } = req.body;
  const imageUrl = req.file ? `/images/products/${req.file.filename}` : '/images/default-product.png';
  const newProduct = {
    id: uuidv4(),
    name,
    price: Number(price || 0),
    description: description || '',
    category: category || '',
    offer: offer || '',
    imageUrl
  };
  products.unshift(newProduct); // newest first
  await writeJson(MENU_FILE, products);
  res.redirect('/admin/products');
});

// edit form
router.get('/products/:id/edit', ensureAdmin, async (req, res) => {
  const products = await readJson(MENU_FILE);
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.redirect('/admin/products');
  res.render('pages/admin-product-form', { product: p, action: `/admin/products/${p.id}/edit` });
});

// update
router.post('/products/:id/edit', ensureAdmin, upload.single('image'), async (req, res) => {
  const products = await readJson(MENU_FILE);
  const idx = products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.redirect('/admin/products');

  const { name, price, description, category, offer } = req.body;
  products[idx].name = name;
  products[idx].price = Number(price || 0);
  products[idx].description = description || '';
  products[idx].category = category || '';
  products[idx].offer = offer || '';

  if (req.file) {
    // optionally delete old file
    const old = products[idx].imageUrl;
    if (old && old.startsWith('/images/products/')) {
      const oldPath = path.join(__dirname, '..', 'public', old);
      fs.unlink(oldPath).catch(()=>{});
    }
    products[idx].imageUrl = `/images/products/${req.file.filename}`;
  }

  await writeJson(MENU_FILE, products);
  res.redirect('/admin/products');
});

// delete
router.post('/products/:id/delete', ensureAdmin, async (req, res) => {
  let products = await readJson(MENU_FILE);
  const idx = products.findIndex(x => x.id === req.params.id);
  if (idx !== -1) {
    const [removed] = products.splice(idx, 1);
    // delete file
    if (removed.imageUrl && removed.imageUrl.startsWith('/images/products/')) {
      const p = path.join(__dirname, '..', 'public', removed.imageUrl);
      fs.unlink(p).catch(()=>{});
    }
    await writeJson(MENU_FILE, products);
  }
  res.redirect('/admin/products');
});

/* ---------- orders ---------- */
// list orders
router.get('/orders', ensureAdmin, async (req, res) => {
  const orders = await readJson(ORDERS_FILE);
  res.render('pages/admin-orders', { orders });
});

// view one order
router.get('/orders/:id', ensureAdmin, async (req, res) => {
  const orders = await readJson(ORDERS_FILE);
  const o = orders.find(x => String(x.id) === String(req.params.id));
  if (!o) return res.redirect('/admin/orders');
  res.render('pages/admin-order-view', { order: o });
});

// update order status
router.post('/orders/:id/status', ensureAdmin, async (req, res) => {
  const { status } = req.body;
  const orders = await readJson(ORDERS_FILE);
  const idx = orders.findIndex(x => String(x.id) === String(req.params.id));
  if (idx === -1) return res.redirect('/admin/orders');
  orders[idx].status = status;
  orders[idx].history = orders[idx].history || [];
  orders[idx].history.push({ status, time: new Date().toISOString() });
  await writeJson(ORDERS_FILE, orders);
  res.redirect(`/admin/orders/${req.params.id}`);
});

module.exports = router;
