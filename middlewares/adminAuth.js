// middlewares/adminAuth.js
function ensureAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  // if request expects json, send 401 json
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/admin/login');
}

module.exports = { ensureAdmin };
