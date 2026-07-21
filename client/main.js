import { fetchApi } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Loader ---
    const loaderOverlay = document.createElement('div');
    loaderOverlay.id = 'global-loader';
    loaderOverlay.className = 'modal hidden';
    loaderOverlay.style.zIndex = '9999';
    loaderOverlay.innerHTML = `
        <div class="loader-content">
            <div class="elegant-spinner"></div>
            <p class="loader-text" id="loader-text-display">Authenticating...</p>
        </div>
    `;
    document.body.appendChild(loaderOverlay);

    window.showLoader = (text = 'Authenticating...') => {
        document.getElementById('loader-text-display').innerText = text;
        loaderOverlay.classList.remove('hidden');
    };

    window.hideLoader = () => {
        loaderOverlay.classList.add('hidden');
    };

    // --- Theme Toggle ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        const currentTheme = localStorage.getItem('theme') || 'dark';
        
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.classList.replace('ph-moon', 'ph-sun');
        }

        themeToggleBtn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeIcon.classList.replace('ph-sun', 'ph-moon');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.replace('ph-moon', 'ph-sun');
            }
        });
    }

    // --- Navbar Scroll Effect ---
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Mobile Menu Toggle ---
    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');
    
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        // Toggle icon
        const icon = mobileToggle.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.replace('ph-list', 'ph-x');
        } else {
            icon.classList.replace('ph-x', 'ph-list');
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target) && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            mobileToggle.querySelector('i').classList.replace('ph-x', 'ph-list');
        }
    });

    // --- Newsletter Form ---
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = newsletterForm.querySelector('input');
            if (input.value) {
                alert('Thank you for subscribing to Archi Fashion! You will receive our latest updates soon.');
                input.value = '';
            }
        });
    }

    window.globalCartIds = [];
    
    // --- Wishlist & Cart Interaction ---
    async function handleAddAction(btn, endpoint, successText) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            document.getElementById('login-modal').classList.remove('hidden');
            return;
        }

        const productId = btn.dataset.id;
        
        // If it's a cart action and already added, redirect to cart page
        if (endpoint === '/api/user/cart' && window.globalCartIds.includes(productId)) {
            window.location.href = './profile.html#cart';
            return;
        }

        const product = {
            id: productId,
            title: btn.dataset.title,
            price: btn.dataset.price,
            image: btn.dataset.image,
            category: btn.dataset.category
        };

        const originalText = btn.innerHTML;
        btn.innerHTML = 'Loading...';
        btn.disabled = true;

        try {
            const data = await fetchApi(endpoint, {
                method: 'POST',
                body: JSON.stringify(product),
                hideLoader: true
            });
            
            if (data && data.success) {
                if (endpoint === '/api/user/cart') {
                    if (!window.globalCartIds.includes(productId)) {
                        window.globalCartIds.push(productId);
                    }
                    
                    const cartBadge = document.querySelector('.cart-badge');
                    if (cartBadge) {
                        cartBadge.innerText = data.cart.length;
                        cartBadge.style.transform = 'scale(1.5)';
                        setTimeout(() => cartBadge.style.transform = 'scale(1)', 200);
                    }
                    
                    // Update stock UI instantly
                    const productCard = btn.closest('.product-card');
                    if (productCard) {
                        const stockEl = productCard.querySelector('.product-stock');
                        if (stockEl) {
                            const match = stockEl.innerText.match(/Stock:\s*(\d+)/);
                            if (match) {
                                let currentStock = parseInt(match[1]);
                                if (currentStock > 0) {
                                    currentStock -= 1;
                                    stockEl.innerText = `Stock: ${currentStock}`;
                                    
                                    if (currentStock === 0) {
                                        setTimeout(() => {
                                            btn.disabled = true;
                                            btn.style.background = '#ccc';
                                            btn.style.cursor = 'not-allowed';
                                            btn.innerHTML = 'Out of Stock';
                                            
                                            const imgWrapper = productCard.querySelector('.product-image-wrapper');
                                            if (imgWrapper && !imgWrapper.querySelector('.badge-new')) {
                                                const badge = document.createElement('div');
                                                badge.className = 'product-badge badge-new';
                                                badge.style.background = '#d9534f';
                                                badge.innerText = 'Out of Stock';
                                                imgWrapper.appendChild(badge);
                                            }
                                        }, 2000);
                                    }
                                }
                            }
                        }
                    }
                }

                const isOutOfStock = btn.innerText === 'Out of Stock' || btn.innerHTML === 'Out of Stock';
                
                btn.innerHTML = successText;
                btn.style.backgroundColor = 'var(--accent-color)';
                btn.style.color = 'white';
                
                if (endpoint === '/api/user/cart' && !isOutOfStock) {
                    btn.disabled = false;
                } else if (!isOutOfStock) {
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.backgroundColor = '';
                        btn.style.color = '';
                        btn.disabled = false;
                    }, 2000);
                }
            } else {
                btn.innerHTML = originalText;
                btn.disabled = false;
                alert(data?.message || 'Action failed');
            }
        } catch (error) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            console.error('Error adding product:', error);
        }
    }

    function attachProductListeners() {
        const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
        const wishlistBtns = document.querySelectorAll('.wishlist-btn');
        
        addToCartBtns.forEach(btn => {
            if (!btn.disabled) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleAddAction(btn, '/api/user/cart', 'Added to Cart');
                });
            }
        });
        
        wishlistBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                handleAddAction(btn, '/api/user/wishlist', '<i class="ph-fill ph-heart"></i>');
            });
        });
    }

    async function loadProducts() {
        const dynamicProducts = document.getElementById('dynamic-products');
        if (!dynamicProducts) return;

        try {
            const data = await fetchApi('/api/products');
            
            if (data && data.success && data.products.length > 0) {
                dynamicProducts.innerHTML = '';
                data.products.forEach(p => {
                    const outOfStock = p.stock <= 0;
                    dynamicProducts.innerHTML += `
                        <div class="product-card">
                            <div class="product-image-wrapper">
                                <img src="${p.image}" alt="${p.title}" class="product-image">
                                <div class="product-actions">
                                    <button class="action-btn wishlist-btn" title="Add to Wishlist" data-id="${p._id}" data-title="${p.title}" data-price="${p.price}" data-image="${p.image}" data-category="${p.category}"><i class="ph ph-heart"></i></button>
                                </div>
                                ${outOfStock ? '<div class="product-badge badge-new" style="background:#d9534f">Out of Stock</div>' : ''}
                                <button class="add-to-cart-btn" ${outOfStock ? 'disabled style="background:#ccc; cursor:not-allowed;"' : ''} data-id="${p._id}" data-title="${p.title}" data-price="${p.price}" data-image="${p.image}" data-category="${p.category}">${outOfStock ? 'Out of Stock' : 'Add to Cart'}</button>
                            </div>
                            <div class="product-info">
                                <span class="product-category">${p.category}</span>
                                <h3 class="product-title">${p.title}</h3>
                                <div class="product-price">₹${p.price.toLocaleString()}</div>
                                <div class="product-stock" style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">Stock: ${p.stock}</div>
                            </div>
                        </div>
                    `;
                });

                attachProductListeners();
            } else {
                dynamicProducts.innerHTML = '<p style="grid-column:1/-1; text-align:center;">No products available at the moment.</p>';
            }
        } catch (error) {
            console.error('Error loading products:', error);
            dynamicProducts.innerHTML = '<p style="grid-column:1/-1; text-align:center;">Error loading products.</p>';
        }
    }

    // Initialize
    attachProductListeners();
    loadProducts();

    // --- Authentication & Modals ---
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeLoginBtn = document.getElementById('close-login');
    const usernameModal = document.getElementById('username-modal');
    const usernameForm = document.getElementById('username-form');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userNameDisplay = document.getElementById('user-name-display');
    const logoutBtn = document.getElementById('logout-btn');

    let tempGoogleData = null;

    const checkAuthStatus = async () => {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('authUser');
        
        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');
            if (userNameDisplay) userNameDisplay.innerText = user.username;
            if (user.picture && userAvatar) userAvatar.src = user.picture;
            
            try {
                const data = await fetchApi('/api/user/cart', { hideLoader: true });
                if (data && data.success) {
                    const cartBadge = document.querySelector('.cart-badge');
                    if (cartBadge) {
                        cartBadge.innerText = data.cart.length;
                    }
                    window.globalCartIds = data.cart.map(item => item.id);
                    
                    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
                        if (window.globalCartIds.includes(btn.dataset.id)) {
                            btn.innerHTML = 'Added to Cart';
                            btn.style.backgroundColor = 'var(--accent-color)';
                            btn.style.color = 'white';
                        }
                    });
                }
            } catch (err) {
                console.error(err);
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userProfile) userProfile.classList.add('hidden');
            const cartBadge = document.querySelector('.cart-badge');
            if (cartBadge) cartBadge.innerText = '0';
        }
    };
    checkAuthStatus();

    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.classList.remove('hidden');
        });
    }

    if (closeLoginBtn && loginModal) {
        closeLoginBtn.addEventListener('click', () => {
            loginModal.classList.add('hidden');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            checkAuthStatus();
            alert('You have been logged out.');
        });
    }

    window._actualGoogleLogin = async (response) => {
        const token = response.credential;
        
        try {
            const data = await fetchApi('/api/auth/google', {
                method: 'POST',
                body: JSON.stringify({ token }),
                loaderText: 'Authenticating...'
            });
            
            if (data && data.success) {
                if (data.isNewUser) {
                    loginModal.classList.add('hidden');
                    usernameModal.classList.remove('hidden');
                    tempGoogleData = data.googleData;
                } else {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('authUser', JSON.stringify(data.user));
                    checkAuthStatus();
                    loginModal.classList.add('hidden');
                }
            } else {
                alert('Authentication failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during Google login:', error);
            alert('A network error occurred. Please try again later.');
        }
    };

    if (usernameForm) {
        usernameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username-input').value;
            
            if (!tempGoogleData) return alert('Session expired, please try logging in again.');
            
            try {
                const data = await fetchApi('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        googleId: tempGoogleData.googleId,
                        email: tempGoogleData.email,
                        picture: tempGoogleData.picture,
                        username: username
                    }),
                    loaderText: 'Registering...'
                });
                
                if (data && data.success) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('authUser', JSON.stringify(data.user));
                    checkAuthStatus();
                    usernameModal.classList.add('hidden');
                    tempGoogleData = null;
                    alert('Welcome to Archi Fashion, ' + data.user.username + '!');
                } else {
                    alert(data?.message || 'Registration failed.');
                }
            } catch (error) {
                console.error('Registration Error:', error);
                alert('A network error occurred.');
            }
        });
    }

});
