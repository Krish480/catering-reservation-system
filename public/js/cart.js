// cart.js - header badge script
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

function updateCartCount() {
  const count = cart.reduce((s, i) => s + (i.quantity || 1), 0);

  const desktopBadge = document.getElementById('cart-badge');
  const mobileBadge = document.getElementById('cart-badge-mobile');

  if (count > 0) {
    if (desktopBadge) { desktopBadge.textContent = count; desktopBadge.classList.remove('hidden'); }
    if (mobileBadge) { mobileBadge.textContent = count; mobileBadge.classList.remove('hidden'); }
  } else {
    if (desktopBadge) desktopBadge.classList.add('hidden');
    if (mobileBadge) mobileBadge.classList.add('hidden');
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateCartCount);
