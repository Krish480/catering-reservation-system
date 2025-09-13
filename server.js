const express = require("express")
const app = express();
const port = 8080;
const path = require("path");
const { title } = require("process");

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

//cart
app.get("/cart", (req, res) => {
  res.render("pages/cart")
})

// About
app.get("/about", (req, res) => {
  res.render("pages/about")
})

// About
app.get("/services", (req, res) => {
  res.render("pages/services")
})

// Admin Credentials (sirf server-side safe)
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASS = "admin123";

// Render admin login page
app.get("/admin-login", (req, res) => {
  res.render("pages/admin-login", { title: "Admin Login" });
});

// Handle login form submit
app.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    res.redirect("/admin"); //Success
  } else {
    res.send("❌ Invalid credentials, try again.");
  }
});

// Admin Dashboard Page
app.get("/admin", (req, res) => {
  res.render("pages/admin",  { title: "Admin Dashboard" });
});

// Import and use Admin routes (upload, orders, etc.)
const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);

// Server Start
app.listen(port, () => {
    console.log(`App is listening on port ${port}`)
})