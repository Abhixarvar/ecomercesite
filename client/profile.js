import { API_BASE } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('authUser');
    
    if (!token || !userStr) {
        window.location.href = './index.html'; // Redirect to home if not logged in
        return;
    }

    const user = JSON.parse(userStr);
    
    // Set Profile Header info
    document.getElementById('profile-page-name').innerText = user.username;
    if (user.picture) document.getElementById('profile-page-avatar').src = user.picture;
    document.getElementById('profile-page-email').innerText = user.email || '';

    // Tab Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(targetId) {
        tabBtns.forEach(btn => {
            if (btn.dataset.target === targetId) {
                btn.classList.add('active');
                btn.style.borderBottomColor = 'var(--primary-color)';
                btn.style.color = 'var(--primary-color)';
            } else {
                btn.classList.remove('active');
                btn.style.borderBottomColor = 'transparent';
                btn.style.color = 'var(--text-color)';
            }
        });
        tabContents.forEach(content => {
            if (content.id === targetId) content.classList.remove('hidden');
            else content.classList.add('hidden');
        });
        
        // Load data based on tab
        if (targetId === 'orders-tab') loadOrders();
        else if (targetId === 'wishlist-tab') loadWishlist();
        else if (targetId === 'cart-tab') loadCart();
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            switchTab(targetId);
            window.location.hash = '#' + targetId.replace('-tab', '');
        });
    });

    // Hash routing
    const handleHash = () => {
        const hash = window.location.hash;
        if (hash === '#cart') switchTab('cart-tab');
        else if (hash === '#wishlist') switchTab('wishlist-tab');
        else switchTab('orders-tab'); // default
    };

    handleHash(); // Run on load
    window.addEventListener('hashchange', handleHash);

    // Load functions
    async function fetchApi(endpoint) {
        if (window.showLoader) window.showLoader('Loading...');
        try {
            const res = await fetch(API_BASE + endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return null;
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }

    async function loadOrders() {
        const data = await fetchApi('/api/user/orders');
        const container = document.getElementById('orders-list');
        if (!data || !data.success || data.orders.length === 0) {
            container.innerHTML = '<p>You have no previous purchases.</p>';
            return;
        }
        
        container.innerHTML = data.orders.map(order => `
            <div class="order-card" style="border: 1px solid var(--border-color); padding: 20px; margin-bottom: 20px; border-radius: 8px; background: var(--bg-white); box-shadow: var(--shadow-sm);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong style="display: block; font-family: var(--font-heading); font-size: 1.1rem;">Order #${order.orderId}</strong>
                        <span style="color: var(--text-light); font-size: 0.9rem;">${new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <div style="font-weight: 600; font-size: 1.2rem; color: var(--primary-color);">
                        $${order.total.toFixed(2)}
                    </div>
                </div>
                <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px;">
                    ${order.items.map(item => `
                        <div style="min-width: 60px;">
                            <img src="${item.image}" alt="${item.title}" title="${item.title}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);">
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    async function loadWishlist() {
        const data = await fetchApi('/api/user/wishlist');
        const container = document.getElementById('wishlist-grid');
        if (!data || !data.success || data.wishlist.length === 0) {
            container.innerHTML = '<p>Your wishlist is empty.</p>';
            return;
        }
        
        container.innerHTML = data.wishlist.map(item => `
            <div class="product-card">
                <img src="${item.image}" alt="${item.title}">
                <div class="product-info">
                    <span class="category">${item.category}</span>
                    <h3 class="title">${item.title}</h3>
                    <div class="price">${item.price}</div>
                    <button class="btn btn-secondary remove-wishlist-btn" data-id="${item.id}" style="width: 100%; margin-top: 15px;">Remove from Wishlist</button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.remove-wishlist-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if(window.showLoader) window.showLoader('Removing...');
                await fetch(`${API_BASE}/api/user/wishlist/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if(window.hideLoader) window.hideLoader();
                loadWishlist();
            });
        });
    }

    let currentCartData = [];
    
    async function loadCart() {
        const data = await fetchApi('/api/user/cart');
        const container = document.getElementById('cart-items');
        if (!data || !data.success || data.cart.length === 0) {
            container.innerHTML = '<p>Your cart is empty.</p>';
            document.getElementById('cart-subtotal').innerText = '$0.00';
            document.getElementById('cart-total').innerText = '$0.00';
            document.getElementById('checkout-btn').disabled = true;
            const whatsappBtn = document.getElementById('whatsapp-share-btn');
            if (whatsappBtn) whatsappBtn.disabled = true;
            return;
        }

        document.getElementById('checkout-btn').disabled = false;
        const whatsappBtn = document.getElementById('whatsapp-share-btn');
        if (whatsappBtn) whatsappBtn.disabled = false;
        
        currentCartData = data.cart;
        
        let total = 0;
        container.innerHTML = data.cart.map(item => {
            const priceNum = parseFloat(item.price.replace(/[^0-9.-]+/g,"")) || 0;
            total += priceNum;
            return `
            <div class="cart-item" style="display: flex; align-items: center; border-bottom: 1px solid var(--border-color); padding: 20px 0;">
                <img src="${item.image}" alt="${item.title}" style="width: 100px; height: 120px; object-fit: cover; border-radius: 4px; margin-right: 20px; border: 1px solid var(--border-color);">
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0; font-family: var(--font-heading); font-size: 1.2rem;">${item.title}</h4>
                    <p style="margin: 5px 0; color: var(--text-light);">${item.category}</p>
                    <strong style="font-size: 1.1rem;">${item.price}</strong>
                </div>
                <button class="remove-cart-btn" data-id="${item.id}" style="background: none; border: none; cursor: pointer; color: var(--primary-color); padding: 10px; transition: var(--transition);">
                    <i class="ph ph-trash" style="font-size: 1.5rem;"></i>
                </button>
            </div>
        `;}).join('');

        document.getElementById('cart-subtotal').innerText = '$' + total.toFixed(2);
        document.getElementById('cart-total').innerText = '$' + total.toFixed(2);

        document.querySelectorAll('.remove-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if(window.showLoader) window.showLoader('Removing...');
                await fetch(`${API_BASE}/api/user/cart/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if(window.hideLoader) window.hideLoader();
                
                // Update badge globally
                const badge = document.querySelector('.cart-badge');
                if (badge) badge.innerText = Math.max(0, parseInt(badge.innerText) - 1);
                
                loadCart();
            });
        });
    }

    // Checkout Logic
    document.getElementById('checkout-btn').addEventListener('click', async () => {
        const addressField = document.getElementById('checkout-address');
        const phoneField = document.getElementById('checkout-phone');
        
        if (!addressField.value.trim() || !phoneField.value.trim()) {
            alert('Please fill out both your Delivery Address and Phone Number.');
            return;
        }

        if(window.showLoader) window.showLoader('Processing payment...');
        
        try {
            const res = await fetch(`${API_BASE}/api/user/checkout`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: addressField.value.trim(),
                    phone: phoneField.value.trim()
                })
            });
            const data = await res.json();
            if(window.hideLoader) window.hideLoader();
            
            if (data.success) {
                const badge = document.querySelector('.cart-badge');
                if (badge) badge.innerText = '0';
                
                addressField.value = '';
                phoneField.value = '';
                
                // Trigger hash change to switch to orders
                window.location.hash = '#orders';
                
                // Alert after a small timeout so DOM updates
                setTimeout(() => {
                    alert('Checkout successful! Your items are now in your Orders.');
                }, 100);
            } else {
                alert(data.message || 'Checkout failed.');
            }
        } catch (e) {
            if(window.hideLoader) window.hideLoader();
            console.error(e);
            alert('A network error occurred.');
        }
    });
    
    // WhatsApp Share Logic
    const whatsappBtn = document.getElementById('whatsapp-share-btn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            if (currentCartData.length === 0) {
                alert('Your cart is empty.');
                return;
            }
            
            let message = "Hello Archi Fashion, I would like to order:\n\n";
            let total = 0;
            
            currentCartData.forEach((item, index) => {
                message += `${index + 1}. ${item.title} - ${item.price}\n`;
                const priceNum = parseFloat(item.price.replace(/[^0-9.-]+/g,"")) || 0;
                total += priceNum;
            });
            
            message += `\nTotal: $${total.toFixed(2)}`;
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/918920530771?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
        });
    }
});
