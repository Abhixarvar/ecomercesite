import { API_BASE } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('auth-overlay');
    const adminDashboard = document.getElementById('admin-dashboard');
    const authTitle = document.getElementById('auth-title');
    const authMessage = document.getElementById('auth-message');
    const authReturnBtn = document.getElementById('auth-return-btn');

    async function checkAdminAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showAccessDenied("You are not logged in. Please log in on the store page first.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/auth/verify-admin`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                // Access granted
                authOverlay.style.display = 'none';
                adminDashboard.classList.remove('hidden');
                loadProducts();
                loadOrders();
            } else {
                showAccessDenied("Access Denied: You do not have administrator privileges.");
            }
        } catch (err) {
            console.error(err);
            showAccessDenied("Network error occurred. Please try again.");
        }
    }

    function showAccessDenied(message) {
        authTitle.innerText = "Access Denied";
        authTitle.style.color = "#d9534f";
        authMessage.innerText = message;
        authReturnBtn.style.display = "inline-block";
    }

    // Run auth check on load
    checkAdminAuth();

    const form = document.getElementById('add-product-form');
    const tbody = document.getElementById('products-tbody');
    const ordersTbody = document.getElementById('orders-tbody');

    // Tab Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.color = 'var(--text-muted)';
            });
            tabContents.forEach(c => c.style.display = 'none');
            
            // Add active class
            btn.classList.add('active');
            btn.style.color = 'var(--primary-color)';
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).style.display = 'block';
        });
    });

    // Load Products
    async function loadProducts() {
        try {
            const res = await fetch(`${API_BASE}/api/products`);
            const data = await res.json();
            
            if (data.success) {
                tbody.innerHTML = '';
                data.products.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><img src="${p.image}" alt="Product"></td>
                        <td>${p.title}</td>
                        <td>${p.category}</td>
                        <td>₹${p.price.toLocaleString()}</td>
                        <td>${p.stock}</td>
                        <td>
                            <button class="delete-btn" data-id="${p._id}"><i class="ph ph-trash"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Attach delete listeners
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.dataset.id;
                        if (confirm('Are you sure you want to delete this product?')) {
                            await deleteProduct(id);
                        }
                    });
                });
            }
        } catch (err) {
            console.error('Failed to load products', err);
        }
    }

    // Load Orders
    async function loadOrders() {
        const token = localStorage.getItem('authToken');
        try {
            const res = await fetch(`${API_BASE}/api/admin/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                ordersTbody.innerHTML = '';
                if (data.orders.length === 0) {
                    ordersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>';
                    return;
                }
                
                data.orders.forEach(order => {
                    const tr = document.createElement('tr');
                    
                    let itemsHtml = order.items.map(item => `<div>${item.title} (₹${item.price})</div>`).join('');
                    let dateStr = new Date(order.date).toLocaleString();
                    
                    tr.innerHTML = `
                        <td>${order.orderId}</td>
                        <td>
                            <strong>${order.customerName}</strong><br>
                            <span style="font-size:0.85rem; color:var(--text-muted);">${order.customerEmail}</span>
                        </td>
                        <td>
                            ${order.address || 'N/A'}<br>
                            <strong>Phone:</strong> ${order.phone || 'N/A'}
                        </td>
                        <td>${itemsHtml}</td>
                        <td>₹${order.total.toLocaleString()}</td>
                        <td>${dateStr}</td>
                    `;
                    ordersTbody.appendChild(tr);
                });
            }
        } catch (err) {
            console.error('Failed to load orders', err);
        }
    }

    // Add Product
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('title', document.getElementById('p-title').value);
        formData.append('category', document.getElementById('p-category').value);
        formData.append('price', document.getElementById('p-price').value);
        formData.append('stock', document.getElementById('p-stock').value);
        
        const imageFile = document.getElementById('p-image').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/api/products`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                form.reset();
                loadProducts();
            } else {
                alert('Failed to add product');
            }
        } catch (err) {
            console.error('Error adding product', err);
        }
    });

    // Delete Product
    async function deleteProduct(id) {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/api/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                loadProducts();
            } else {
                alert('Failed to delete product');
            }
        } catch (err) {
            console.error('Error deleting product', err);
        }
    }
});
