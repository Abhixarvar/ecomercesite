import { API_BASE } from './config.js';

const wishlistContainer = document.getElementById('wishlist-container');

async function fetchWishlist() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        wishlistContainer.innerHTML = '<p style="grid-column: 1/-1;">Please <a href="#" id="login-link">login</a> to view your wishlist.</p>';
        document.getElementById('login-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-modal').classList.remove('hidden');
        });
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/user/wishlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            renderWishlist(data.wishlist);
        } else {
            wishlistContainer.innerHTML = '<p style="grid-column: 1/-1;">Failed to load wishlist.</p>';
        }
    } catch (err) {
        console.error(err);
        wishlistContainer.innerHTML = '<p style="grid-column: 1/-1;">Error loading wishlist.</p>';
    }
}

function renderWishlist(items) {
    if (items.length === 0) {
        wishlistContainer.innerHTML = '<p style="grid-column: 1/-1;">Your wishlist is empty.</p>';
        return;
    }

    let html = '';

    items.forEach(item => {
        html += `
            <div class="product-card">
                <div class="product-image-wrapper">
                    <img src="${item.image}" alt="${item.title}" class="product-image">
                    <div class="product-actions">
                        <button class="action-btn remove-wishlist-btn" title="Remove from Wishlist" data-id="${item.id}"><i class="ph ph-trash"></i></button>
                    </div>
                    <button class="add-to-cart-btn-wishlist" data-id="${item.id}" data-title="${item.title}" data-price="${item.price}" data-image="${item.image}" data-category="${item.category}" style="width: 100%; padding: 12px; background: var(--bg-white); border: none; border-top: 1px solid var(--border-color); font-weight: 500; cursor: pointer; transition: var(--transition);">Move to Cart</button>
                </div>
                <div class="product-info">
                    <span class="product-category">${item.category}</span>
                    <h3 class="product-title">${item.title}</h3>
                    <div class="product-price">₹${item.price}</div>
                </div>
            </div>
        `;
    });

    wishlistContainer.innerHTML = html;

    // Remove logic
    document.querySelectorAll('.remove-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const token = localStorage.getItem('authToken');
            try {
                const res = await fetch(`${API_BASE}/api/user/wishlist/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    renderWishlist(data.wishlist);
                }
            } catch (err) {
                console.error(err);
            }
        });
    });

    // Move to cart logic
    document.querySelectorAll('.add-to-cart-btn-wishlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('authToken');
            const product = {
                id: btn.dataset.id,
                title: btn.dataset.title,
                price: btn.dataset.price,
                image: btn.dataset.image,
                category: btn.dataset.category
            };

            try {
                // Add to cart
                const resCart = await fetch(`${API_BASE}/api/user/cart`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(product)
                });
                const cartData = await resCart.json();
                
                if (cartData.success) {
                    const cartBadge = document.querySelector('.cart-badge');
                    if (cartBadge) cartBadge.innerText = cartData.cart.length;
                    
                    // Remove from wishlist
                    const resWish = await fetch(`${API_BASE}/api/user/wishlist/${product.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const wishData = await resWish.json();
                    if (wishData.success) {
                        renderWishlist(wishData.wishlist);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        });
    });
}

// Load wishlist on page load
fetchWishlist();
