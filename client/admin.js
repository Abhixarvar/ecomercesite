import { API_BASE } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('auth-overlay');
    const adminDashboard = document.getElementById('admin-dashboard');
    const loginBtn = document.getElementById('admin-login-btn');
    const passInput = document.getElementById('admin-password');
    const errorMsg = document.getElementById('admin-error');

    // Simple passcode check (Hardcoded for now as requested)
    loginBtn.addEventListener('click', () => {
        if (passInput.value === 'admin123') {
            authOverlay.style.display = 'none';
            adminDashboard.classList.remove('hidden');
            loadProducts();
        } else {
            errorMsg.style.display = 'block';
        }
    });

    const form = document.getElementById('add-product-form');
    const tbody = document.getElementById('products-tbody');

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

    // Add Product
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newProduct = {
            title: document.getElementById('p-title').value,
            category: document.getElementById('p-category').value,
            price: Number(document.getElementById('p-price').value),
            stock: Number(document.getElementById('p-stock').value),
            image: document.getElementById('p-image').value
        };

        try {
            const res = await fetch(`${API_BASE}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
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
            const res = await fetch(`${API_BASE}/api/products/${id}`, {
                method: 'DELETE'
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
