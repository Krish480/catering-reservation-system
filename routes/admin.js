const express = require("express");
const router = express.Router();

// Admin Dashboard
router.get("/", (req, res) => {
  res.render("pages/admin", { title: "Admin Dashboard" });
});

// Upload Product Page
router.get("/upload", (req, res) => {
  res.render("pages/admin-upload", { title: "Upload Product" });
});

// Upload Product (Dummy — abhi ke liye test)
router.post("/upload-product", (req, res) => {
  const { name, price, category, imageURL } = req.body;
  console.log("📦 New Product:", name, price, category, imageURL);
  res.redirect("/menu");
});

// Orders Page (Dummy — abhi ke liye test)
router.get("/orders", (req, res) => {
  res.render("pages/orders", { title: "Orders", orders: [] });
});

module.exports = router;
