// middlewares/auth.js
function ensureAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/auth/login');
}
module.exports = { ensureAuth };
