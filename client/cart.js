import { API_BASE } from './config.js';

const cartContainer = document.getElementById('cart-container');
const cartSummary = document.getElementById('cart-summary');
const cartTotal = document.getElementById('cart-total');

async function fetchCart() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        cartContainer.innerHTML = '<p>Please <a href="#" id="login-link">login</a> to view your cart.</p>';
        document.getElementById('login-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-modal').classList.remove('hidden');
        });
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/user/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            renderCart(data.cart);
        } else {
            cartContainer.innerHTML = '<p>Failed to load cart.</p>';
        }
    } catch (err) {
        console.error(err);
        cartContainer.innerHTML = '<p>Error loading cart.</p>';
    }
}

function renderCart(cartItems) {
    if (cartItems.length === 0) {
        cartContainer.innerHTML = '<p>Your cart is empty.</p>';
        cartSummary.style.display = 'none';
        return;
    }

    let html = '';
    let total = 0;

    cartItems.forEach(item => {
        total += Number(item.price);
        html += `
            <div class="cart-item" style="display: flex; gap: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px; align-items: center;">
                <img src="${item.image}" alt="${item.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                <div style="flex: 1;">
                    <h3 style="margin-bottom: 5px;">${item.title}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${item.category}</p>
                    <h4 style="color: var(--primary-color); margin-top: 10px;">₹${item.price}</h4>
                </div>
                <button class="btn btn-outline remove-cart-btn" data-id="${item.id}">Remove</button>
            </div>
        `;
    });

    cartContainer.innerHTML = html;
    cartTotal.innerText = total.toLocaleString();
    cartSummary.style.display = 'block';

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-cart-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const token = localStorage.getItem('authToken');
            try {
                const res = await fetch(`${API_BASE}/api/user/cart/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    renderCart(data.cart);
                    // update badge
                    const cartBadge = document.querySelector('.cart-badge');
                    if (cartBadge) cartBadge.innerText = data.cart.length;
                }
            } catch (err) {
                console.error(err);
            }
        });
    });
}

// Load cart on page load
fetchCart();
