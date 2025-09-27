async function updateCartCount() {
  try {
    const res = await fetch("/cart/data");
    const data = await res.json();
    const count = data.cartCount || 0;

    // Desktop badge
    const desktopBadge = document.getElementById("cart-badge");
    if (desktopBadge) {
      desktopBadge.textContent = count;
      desktopBadge.style.display = count > 0 ? "flex" : "none";
    }

    // Mobile badge
    const mobileBadge = document.getElementById("cart-badge-mobile"); // ya tumhare mobile badge ka id
    if (mobileBadge) {
      mobileBadge.textContent = count;
      mobileBadge.style.display = count > 0 ? "flex" : "none";
    }

  } catch (err) {
    console.error("Error fetching cart count:", err);
  }
}


window.updateCartCount = updateCartCount;
window.addEventListener("DOMContentLoaded", updateCartCount);

// Add to cart function (use in product page)
async function addToCartFromProduct(product) {
  if (!product || !product.id) return alert("Product not available");

  const finalPrice = product.discount
    ? product.price - (product.price * product.discount) / 100
    : product.price;

  const item = {
    id: product.id,
    name: product.name,
    price: finalPrice,
    originalPrice: product.price,
    imageUrl: product.imageUrl,
    quantity: 1
  };

  try {
    const res = await fetch("/cart/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`${product.name} added to cart 🛒`);
      updateCartCount();
    } else {
      alert("Failed to add to cart");
    }
  } catch (err) {
    console.error("Error adding to cart:", err);
  }
}
