import { fetchApi } from './apiClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('auth-overlay');
    const adminDashboard = document.getElementById('admin-dashboard');
    const authTitle = document.getElementById('auth-title');
    const authMessage = document.getElementById('auth-message');
    const authReturnBtn = document.getElementById('auth-return-btn');

    // Theme logic
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function applySystemTheme(e) {
        if (e.matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }
    applySystemTheme(mediaQuery);
    mediaQuery.addEventListener('change', applySystemTheme);

    // Global state
    let allProductsCache = [];
    let allBannersCache = [];
    let allListsCache = [];
    let selectedProductIds = [];
    let editingListId = null;

    // Verify Admin Authentication
    async function checkAdminAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showAccessDenied("You are not logged in. Please log in on the store page first.");
            return;
        }

        try {
            const data = await fetchApi('/api/auth/verify-admin', { hideLoader: true });
            
            if (data && data.success) {
                authOverlay.style.display = 'none';
                adminDashboard.classList.remove('hidden');
                refreshAllDashboardData();
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
        const authSpinner = document.getElementById('auth-spinner');
        if (authSpinner) authSpinner.style.display = 'none';
    }

    checkAdminAuth();

    function refreshAllDashboardData() {
        loadProducts();
        loadBanners();
        loadLists();
        loadOrders();
        loadAnnouncements();
    }

    // --- Tab Switching Logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.style.display = 'block';
        });
    });

    // --- TAB 1: PRODUCTS MANAGEMENT ---
    const productForm = document.getElementById('add-product-form');
    const productsTbody = document.getElementById('products-tbody');
    const productSearchInput = document.getElementById('product-search-input');

    async function loadProducts() {
        try {
            const data = await fetchApi('/api/products', { hideLoader: true });
            if (data && data.success) {
                allProductsCache = data.products || [];
                document.getElementById('stat-products-count').innerText = allProductsCache.length;
                renderProductsTable(allProductsCache);
            }
        } catch (err) {
            console.error('Failed to load products', err);
        }
    }

    function renderProductsTable(products) {
        if (!productsTbody) return;
        productsTbody.innerHTML = '';
        if (products.length === 0) {
            productsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No clothes found in inventory.</td></tr>';
            return;
        }

        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${p.image}" alt="${p.title}"></td>
                <td><strong>${p.title}</strong></td>
                <td><span class="chip-badge">${p.category}</span></td>
                <td>₹${p.price.toLocaleString()}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="number" value="${p.stock}" min="0" id="stock-${p._id}" style="width: 70px; padding: 6px; border: 1px solid var(--border-color); border-radius: 6px;">
                        <button class="update-stock-btn action-icon-btn" data-id="${p._id}" title="Save Stock"><i class="ph ph-floppy-disk"></i></button>
                    </div>
                </td>
                <td>
                    <button class="action-icon-btn delete-btn delete-product-btn" data-id="${p._id}" title="Delete Product"><i class="ph ph-trash"></i></button>
                </td>
            `;
            productsTbody.appendChild(tr);
        });

        // Stock update buttons
        document.querySelectorAll('.update-stock-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const newStock = document.getElementById(`stock-${id}`).value;
                await updateStock(id, newStock);
            });
        });

        // Delete product buttons
        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this product from inventory?')) {
                    await deleteProduct(id);
                }
            });
        });
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = allProductsCache.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.category.toLowerCase().includes(query)
            );
            renderProductsTable(filtered);
        });
    }

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
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
                const data = await fetchApi('/api/products', {
                    method: 'POST',
                    body: formData,
                    loaderText: 'Adding Product to Inventory...'
                });
                
                if (data && data.success) {
                    productForm.reset();
                    loadProducts();
                    alert('Product added successfully!');
                } else {
                    alert(data?.message || 'Failed to add product');
                }
            } catch (err) {
                console.error('Error adding product', err);
            }
        });
    }

    async function deleteProduct(id) {
        try {
            const data = await fetchApi(`/api/products/${id}`, {
                method: 'DELETE',
                loaderText: 'Deleting Product...'
            });
            if (data && data.success) {
                loadProducts();
            } else {
                alert(data?.message || 'Failed to delete product');
            }
        } catch (err) {
            console.error('Error deleting product', err);
        }
    }

    async function updateStock(id, stock) {
        try {
            const data = await fetchApi(`/api/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ stock: Number(stock) }),
                loaderText: 'Updating Stock...'
            });
            if (data && data.success) {
                loadProducts();
                alert('Stock updated successfully');
            } else {
                alert(data?.message || 'Failed to update stock');
            }
        } catch (err) {
            console.error('Error updating stock', err);
        }
    }

    // --- TAB 2: HERO BANNER SLIDESHOW ---
    const bannerForm = document.getElementById('add-banner-form');
    const bannersTbody = document.getElementById('banners-tbody');

    async function loadBanners() {
        try {
            const data = await fetchApi('/api/banners/admin', { hideLoader: true });
            if (data && data.success) {
                allBannersCache = data.banners || [];
                document.getElementById('stat-banners-count').innerText = allBannersCache.length;
                renderBannersTable(allBannersCache);
            }
        } catch (err) {
            console.error('Failed to load banners', err);
        }
    }

    function renderBannersTable(banners) {
        if (!bannersTbody) return;
        bannersTbody.innerHTML = '';
        if (banners.length === 0) {
            bannersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No banner slides added yet. Standard default hero banner will be shown.</td></tr>';
            return;
        }

        banners.forEach(b => {
            const tr = document.createElement('tr');
            const statusClass = b.isActive ? 'active' : 'inactive';
            const statusText = b.isActive ? 'Active' : 'Hidden';

            tr.innerHTML = `
                <td><img src="${b.image}" alt="Banner" style="width:100px; height:50px; object-fit:cover; border-radius:6px;"></td>
                <td>
                    <strong>${b.title || 'Untitled Banner'}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${b.subtitle || 'No subtitle'}</span>
                </td>
                <td><code style="background:#eee; padding:2px 6px; border-radius:4px;">${b.linkUrl}</code></td>
                <td><strong>${b.order}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-icon-btn toggle-banner-btn" data-id="${b._id}" title="Toggle Active/Hidden"><i class="ph ph-power"></i></button>
                    <button class="action-icon-btn delete-btn delete-banner-btn" data-id="${b._id}" title="Delete Banner"><i class="ph ph-trash"></i></button>
                </td>
            `;
            bannersTbody.appendChild(tr);
        });

        document.querySelectorAll('.toggle-banner-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                await toggleBanner(id);
            });
        });

        document.querySelectorAll('.delete-banner-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this hero banner slide?')) {
                    await deleteBanner(id);
                }
            });
        });
    }

    if (bannerForm) {
        bannerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('title', document.getElementById('b-title').value);
            formData.append('subtitle', document.getElementById('b-subtitle').value);
            formData.append('buttonText', document.getElementById('b-btntext').value);
            formData.append('linkUrl', document.getElementById('b-link').value);
            formData.append('order', document.getElementById('b-order').value);

            const fileInput = document.getElementById('b-image');
            if (fileInput && fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
            }

            try {
                const data = await fetchApi('/api/banners', {
                    method: 'POST',
                    body: formData,
                    loaderText: 'Uploading Hero Banner Slide...'
                });

                if (data && data.success) {
                    bannerForm.reset();
                    document.getElementById('b-btntext').value = 'Shop Collection';
                    document.getElementById('b-link').value = '#collection';
                    document.getElementById('b-order').value = '0';
                    loadBanners();
                    alert('Hero banner slide created successfully!');
                } else {
                    alert(data?.message || 'Failed to add banner');
                }
            } catch (err) {
                console.error('Error adding banner', err);
            }
        });
    }

    async function toggleBanner(id) {
        try {
            const data = await fetchApi(`/api/banners/${id}/toggle`, {
                method: 'PUT',
                loaderText: 'Toggling Status...'
            });
            if (data && data.success) loadBanners();
        } catch (err) {
            console.error('Error toggling banner', err);
        }
    }

    async function deleteBanner(id) {
        try {
            const data = await fetchApi(`/api/banners/${id}`, {
                method: 'DELETE',
                loaderText: 'Deleting Banner...'
            });
            if (data && data.success) loadBanners();
        } catch (err) {
            console.error('Error deleting banner', err);
        }
    }

    // --- TAB 3: CURATED PRODUCT LISTS (COLLECTIONS) ---
    const listForm = document.getElementById('add-list-form');
    const listsTbody = document.getElementById('lists-tbody');
    const openPickerBtn = document.getElementById('open-picker-btn');
    const pickerModal = document.getElementById('picker-modal');
    const closePickerModal = document.getElementById('close-picker-modal');
    const confirmPickerSelection = document.getElementById('confirm-picker-selection');
    const pickerGridContainer = document.getElementById('picker-grid-container');
    const pickerSearchInput = document.getElementById('picker-search-input');
    const pickerCategorySelect = document.getElementById('picker-category-select');
    const modalSelectedCounter = document.getElementById('modal-selected-counter');
    const selectedBadge = document.getElementById('selected-products-count-badge');
    const selectedItemsNames = document.getElementById('selected-items-names');

    async function loadLists() {
        try {
            const data = await fetchApi('/api/product-lists/admin', { hideLoader: true });
            if (data && data.success) {
                allListsCache = data.lists || [];
                document.getElementById('stat-lists-count').innerText = allListsCache.length;
                renderListsTable(allListsCache);
            }
        } catch (err) {
            console.error('Failed to load product lists', err);
        }
    }

    function renderListsTable(lists) {
        if (!listsTbody) return;
        listsTbody.innerHTML = '';
        if (lists.length === 0) {
            listsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No curated product lists created yet.</td></tr>';
            return;
        }

        lists.forEach(l => {
            const tr = document.createElement('tr');
            const statusClass = l.isActive ? 'active' : 'inactive';
            const statusText = l.isActive ? 'Active' : 'Hidden';
            const count = (l.products || []).length;

            tr.innerHTML = `
                <td>
                    <strong>${l.title}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${l.description || 'No description'}</span>
                </td>
                <td>${l.badgeText ? `<span class="chip-badge">${l.badgeText}</span>` : '<span style="color:#aaa;">-</span>'}</td>
                <td><strong>${count} Clothes</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-icon-btn edit-list-btn" data-id="${l._id}" title="Edit Collection List"><i class="ph ph-note-pencil"></i></button>
                    <button class="action-icon-btn toggle-list-btn" data-id="${l._id}" title="Toggle Active Status"><i class="ph ph-power"></i></button>
                    <button class="action-icon-btn delete-btn delete-list-btn" data-id="${l._id}" title="Delete List"><i class="ph ph-trash"></i></button>
                </td>
            `;
            listsTbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-list-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                startEditingList(id);
            });
        });

        document.querySelectorAll('.toggle-list-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                await toggleList(id);
            });
        });

        document.querySelectorAll('.delete-list-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this curated collection list?')) {
                    await deleteList(id);
                }
            });
        });
    }

    // Modal Picker Trigger
    if (openPickerBtn && pickerModal) {
        openPickerBtn.addEventListener('click', () => {
            renderPickerItems();
            pickerModal.classList.remove('hidden');
        });
    }

    if (closePickerModal && pickerModal) {
        closePickerModal.addEventListener('click', () => {
            pickerModal.classList.add('hidden');
        });
    }

    if (confirmPickerSelection && pickerModal) {
        confirmPickerSelection.addEventListener('click', () => {
            pickerModal.classList.add('hidden');
            updateSelectedSummaryUI();
        });
    }

    function renderPickerItems() {
        if (!pickerGridContainer) return;
        pickerGridContainer.innerHTML = '';

        const searchQuery = (pickerSearchInput?.value || '').toLowerCase().trim();
        const catQuery = (pickerCategorySelect?.value || '').trim();

        const filtered = allProductsCache.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery);
            const matchesCat = !catQuery || p.category === catQuery;
            return matchesSearch && matchesCat;
        });

        if (filtered.length === 0) {
            pickerGridContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding: 20px;">No clothes matched your filter.</p>';
            return;
        }

        filtered.forEach(p => {
            const isSelected = selectedProductIds.includes(p._id);
            const itemDiv = document.createElement('div');
            itemDiv.className = `picker-item ${isSelected ? 'selected' : ''}`;
            itemDiv.dataset.id = p._id;

            itemDiv.innerHTML = `
                <img src="${p.image}" alt="${p.title}">
                <div class="picker-item-info">
                    <div class="picker-item-title">${p.title}</div>
                    <div class="picker-item-sub">${p.category} • ₹${p.price.toLocaleString()}</div>
                </div>
                <div style="font-size: 1.2rem; color: var(--primary-color);">
                    <i class="ph ${isSelected ? 'ph-check-circle-fill' : 'ph-circle'}"></i>
                </div>
            `;

            itemDiv.addEventListener('click', () => {
                if (selectedProductIds.includes(p._id)) {
                    selectedProductIds = selectedProductIds.filter(id => id !== p._id);
                } else {
                    selectedProductIds.push(p._id);
                }
                renderPickerItems();
                updateSelectedSummaryUI();
            });

            pickerGridContainer.appendChild(itemDiv);
        });

        if (modalSelectedCounter) {
            modalSelectedCounter.innerText = `${selectedProductIds.length} Selected`;
        }
    }

    if (pickerSearchInput) pickerSearchInput.addEventListener('input', renderPickerItems);
    if (pickerCategorySelect) pickerCategorySelect.addEventListener('change', renderPickerItems);

    function updateSelectedSummaryUI() {
        if (selectedBadge) selectedBadge.innerText = selectedProductIds.length;
        if (selectedItemsNames) {
            if (selectedProductIds.length === 0) {
                selectedItemsNames.innerText = 'No products selected yet';
            } else {
                const names = allProductsCache
                    .filter(p => selectedProductIds.includes(p._id))
                    .map(p => p.title);
                selectedItemsNames.innerText = names.join(', ');
            }
        }
    }

    if (listForm) {
        listForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('l-title').value;
            const badgeText = document.getElementById('l-badge').value;
            const description = document.getElementById('l-desc').value;

            if (selectedProductIds.length === 0) {
                alert('Please select at least 1 product for this list by clicking "Pick Clothes from Database".');
                return;
            }

            const payload = {
                title,
                badgeText,
                description,
                products: selectedProductIds
            };

            try {
                let url = '/api/product-lists';
                let method = 'POST';
                let loaderText = 'Creating Curated Product List...';

                if (editingListId) {
                    url = `/api/product-lists/${editingListId}`;
                    method = 'PUT';
                    loaderText = 'Updating Curated List...';
                }

                const data = await fetchApi(url, {
                    method: method,
                    body: JSON.stringify(payload),
                    loaderText: loaderText
                });

                if (data && data.success) {
                    const wasEditing = !!editingListId;
                    listForm.reset();
                    selectedProductIds = [];
                    editingListId = null;
                    const submitBtn = listForm.querySelector('button[type="submit"]');
                    if (submitBtn) submitBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Save Product List';
                    updateSelectedSummaryUI();
                    loadLists();
                    alert(wasEditing ? 'List updated successfully!' : 'Curated collection list created successfully!');
                } else {
                    alert(data?.message || 'Failed to save list');
                }
            } catch (err) {
                console.error('Error saving list', err);
            }
        });
    }

    function startEditingList(id) {
        const list = allListsCache.find(l => l._id === id);
        if (!list) return;

        editingListId = id;
        document.getElementById('l-title').value = list.title || '';
        document.getElementById('l-badge').value = list.badgeText || '';
        document.getElementById('l-desc').value = list.description || '';

        selectedProductIds = (list.products || []).map(p => typeof p === 'object' ? p._id : p);
        updateSelectedSummaryUI();

        const submitBtn = listForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '<i class="ph ph-check-bold"></i> Update Curated List';

        // Scroll to form
        listForm.scrollIntoView({ behavior: 'smooth' });
    }

    async function toggleList(id) {
        try {
            const data = await fetchApi(`/api/product-lists/${id}/toggle`, {
                method: 'PUT',
                loaderText: 'Toggling Status...'
            });
            if (data && data.success) loadLists();
        } catch (err) {
            console.error('Error toggling list', err);
        }
    }

    async function deleteList(id) {
        try {
            const data = await fetchApi(`/api/product-lists/${id}`, {
                method: 'DELETE',
                loaderText: 'Deleting List...'
            });
            if (data && data.success) loadLists();
        } catch (err) {
            console.error('Error deleting list', err);
        }
    }

    // --- TAB 4: ORDERS ---
    const ordersTbody = document.getElementById('orders-tbody');

    async function loadOrders() {
        try {
            const data = await fetchApi('/api/admin/orders', { hideLoader: true });
            if (data && data.success) {
                document.getElementById('stat-orders-count').innerText = data.orders.length;
                renderOrdersTable(data.orders);
            }
        } catch (err) {
            console.error('Failed to load orders', err);
        }
    }

    function renderOrdersTable(orders) {
        if (!ordersTbody) return;
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No customer orders found yet.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement('tr');
            let itemsHtml = (order.items || []).map(item => `<div>${item.title} (₹${item.price.toLocaleString()})</div>`).join('');
            let dateStr = new Date(order.date).toLocaleString();
            
            tr.innerHTML = `
                <td><code>${order.orderId}</code></td>
                <td>
                    <strong>${order.customerName}</strong><br>
                    <span style="font-size:0.85rem; color:var(--text-muted);">${order.customerEmail}</span>
                </td>
                <td>
                    ${order.address || 'N/A'}<br>
                    <strong>Phone:</strong> ${order.phone || 'N/A'}
                </td>
                <td>${itemsHtml}</td>
                <td><strong>₹${order.total.toLocaleString()}</strong></td>
                <td>${dateStr}</td>
            `;
            ordersTbody.appendChild(tr);
        });
    }

    // --- TAB 5: ANNOUNCEMENTS ---
    const announcementForm = document.getElementById('add-announcement-form');
    const announcementsTbody = document.getElementById('announcements-tbody');

    async function loadAnnouncements() {
        try {
            const data = await fetchApi('/api/announcements', { hideLoader: true });
            if (data && data.success) {
                renderAnnouncementsTable(data.announcements);
            }
        } catch (err) {
            console.error('Failed to load announcements', err);
        }
    }

    function renderAnnouncementsTable(announcements) {
        if (!announcementsTbody) return;
        announcementsTbody.innerHTML = '';
        if (announcements.length === 0) {
            announcementsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No announcements posted yet.</td></tr>';
            return;
        }

        announcements.forEach(a => {
            const tr = document.createElement('tr');
            const statusClass = a.isActive ? 'active' : 'inactive';
            const statusText = a.isActive ? 'Active' : 'Inactive';
                
            tr.innerHTML = `
                <td>${a.message}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${new Date(a.createdAt).toLocaleString()}</td>
                <td>
                    <button class="action-icon-btn toggle-announcement-btn" data-id="${a._id}" title="Toggle Active"><i class="ph ph-power"></i></button>
                    <button class="action-icon-btn delete-btn delete-announcement-btn" data-id="${a._id}" title="Delete Announcement"><i class="ph ph-trash"></i></button>
                </td>
            `;
            announcementsTbody.appendChild(tr);
        });

        document.querySelectorAll('.toggle-announcement-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                await toggleAnnouncement(id);
            });
        });
        
        document.querySelectorAll('.delete-announcement-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this announcement?')) {
                    await deleteAnnouncement(id);
                }
            });
        });
    }

    if (announcementForm) {
        announcementForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = document.getElementById('a-message').value;

            try {
                const data = await fetchApi('/api/announcements', {
                    method: 'POST',
                    body: JSON.stringify({ message }),
                    loaderText: 'Posting Announcement...'
                });
                
                if (data && data.success) {
                    announcementForm.reset();
                    loadAnnouncements();
                    alert('Announcement posted!');
                } else {
                    alert(data?.message || 'Failed to post announcement');
                }
            } catch (err) {
                console.error('Error posting announcement', err);
            }
        });
    }

    async function toggleAnnouncement(id) {
        try {
            const data = await fetchApi(`/api/announcements/${id}/toggle`, {
                method: 'PUT',
                loaderText: 'Toggling Status...'
            });
            if (data && data.success) loadAnnouncements();
        } catch (err) {
            console.error('Error toggling', err);
        }
    }
    
    async function deleteAnnouncement(id) {
        try {
            const data = await fetchApi(`/api/announcements/${id}`, {
                method: 'DELETE',
                loaderText: 'Deleting...'
            });
            if (data && data.success) loadAnnouncements();
        } catch (err) {
            console.error('Error deleting', err);
        }
    }
});
