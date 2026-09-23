import { fetchApi } from './apiClient.js';
let Toastify;
import('toastify-js').then(module => {
    Toastify = module.default || module;
});
import "toastify-js/src/toastify.css";

const init = () => {
    console.log("INIT WAS CALLED SUCCESSFULLY");
    // --- Global Loader ---
    const loaderOverlay = document.createElement('div');
    loaderOverlay.id = 'global-loader';
    loaderOverlay.className = 'modal hidden';
    loaderOverlay.style.zIndex = '9999';
    loaderOverlay.innerHTML = `
        <div class="loader-content">
            <div class="elegant-spinner"></div>
            <p class="loader-text" id="loader-text-display">Namaste,please wait...</p>
        </div>
    `;
    document.body.appendChild(loaderOverlay);

    window.showLoader = (text = 'Namaste,please wait...') => {
        document.getElementById('loader-text-display').innerText = text;
        loaderOverlay.classList.remove('hidden');
    };

    window.hideLoader = () => {
        loaderOverlay.classList.add('hidden');
    };

    // --- Theme Logic (System Preference Only) ---
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

    // --- Intersection Observer for Scroll Animations ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                entry.target.classList.remove('visible');
            }
        });
    }, { threshold: 0, rootMargin: '0px 0px 50px 0px' });

    // Expose globally so other scripts can use it
    window.observeElements = () => {
        document.querySelectorAll('.animate-on-scroll:not(.observed)').forEach(el => {
            el.classList.add('observed');
            observer.observe(el);
        });
    };
    
    // Initial call
    window.observeElements();

    // --- Page Transitions logic removed ---

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
                        cartBadge.classList.add('pop');
                        setTimeout(() => cartBadge.classList.remove('pop'), 300);
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
                                            if (imgWrapper && !imgWrapper.querySelector('.out-of-stock-overlay')) {
                                                const badge = document.createElement('div');
                                                badge.className = 'out-of-stock-overlay';
                                                badge.innerHTML = '<span>OUT OF STOCK</span>';
                                                imgWrapper.appendChild(badge);
                                            }
                                        }, 2000);
                                    }
                                }
                            }
                        }
                    }
                }

                btn.innerHTML = successText;
                btn.style.backgroundColor = 'var(--accent-color)';
                btn.style.color = 'white';
                
                if (endpoint === '/api/user/cart') {
                    btn.disabled = false;
                } else {
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
                if (data?.message === 'Invalid token' || data?.message === 'Access denied') {
                    document.getElementById('login-modal')?.classList.remove('hidden');
                } else {
                    alert(data?.message || 'Action failed');
                }
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

    // Shared product card HTML generator — used by loadProducts and loadCuratedCollections
    function renderProductCardHTML(p) {
        const outOfStock = p.stock <= 0;
        return `
            <div class="product-card">
                <div class="product-image-wrapper">
                    <img src="${p.image}" alt="${p.title}" class="product-image">
                    <div class="product-actions" style="z-index: 20;">
                        <button class="action-btn wishlist-btn" title="${outOfStock ? 'Notify me when restocked' : 'Add to Wishlist'}" data-id="${p._id}" data-title="${p.title}" data-price="${p.price}" data-image="${p.image}" data-category="${p.category}"><i class="ph ph-heart"></i></button>
                    </div>
                    ${outOfStock ? '<div class="out-of-stock-overlay"><span>OUT OF STOCK</span></div>' : ''}
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
    }

    async function loadProducts() {
        const dynamicProducts = document.getElementById('dynamic-products');
        if (!dynamicProducts) return;

        // Add skeleton loaders
        let skeletons = '';
        for (let i = 0; i < 6; i++) {
            skeletons += `
                <div class="skeleton-card">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text medium"></div>
                        <div class="skeleton-text short"></div>
                    </div>
                </div>
            `;
        }
        dynamicProducts.innerHTML = skeletons;

        try {
            const data = await fetchApi('/api/products', { hideLoader: true });
            
            if (data && data.success && data.products.length > 0) {
                const htmlStr = data.products.map(renderProductCardHTML).join('');
                console.log("RENDERED HTML LENGTH:", htmlStr.length);
                dynamicProducts.innerHTML = htmlStr;
                
                attachProductListeners();
                window.observeElements();
            } else {
                dynamicProducts.innerHTML = '<p style="grid-column:1/-1; text-align:center;">No products available at the moment.</p>';
            }
        } catch (error) {
            console.error('Error loading products:', error);
            dynamicProducts.innerHTML = '<p style="grid-column:1/-1; text-align:center;">Error loading products.</p>';
        }
    }

    // Initialize
    loadProducts();
    loadHeroBanners();
    loadCuratedCollections();

    async function loadHeroBanners() {
        const slidesWrapper = document.getElementById('hero-slides-wrapper');
        const dotsContainer = document.getElementById('hero-dots');
        const prevBtn = document.getElementById('hero-prev');
        const nextBtn = document.getElementById('hero-next');
        const heroEl = document.getElementById('hero');

        if (!slidesWrapper) return;

        try {
            const data = await fetchApi('/api/banners', { hideLoader: true });
            if (data && data.success && data.banners && data.banners.length > 0) {
                slidesWrapper.innerHTML = '';
                if (dotsContainer) dotsContainer.innerHTML = '';

                const banners = data.banners;
                let currentSlideIndex = 0;
                let slideInterval = null;

                banners.forEach((b, index) => {
                    const slideDiv = document.createElement('div');
                    slideDiv.className = `hero-slide ${index === 0 ? 'active' : ''}`;
                    
                    const titleHtml = b.title ? `<h2 class="hero-title">${b.title.replace('\n', '<br>')}</h2>` : '<h2 class="hero-title">Elegance in<br>Every Thread</h2>';
                    const subtitleHtml = b.subtitle ? `<p class="hero-subtitle">${b.subtitle}</p>` : '';
                    const btnText = b.buttonText || 'Shop Collection';
                    const linkUrl = b.linkUrl || '#collection';

                    slideDiv.innerHTML = `
                        <div class="hero-image-container">
                            <img src="${b.image}" alt="${b.title || 'Banner Slide'}" class="hero-image">
                            <div class="hero-overlay"></div>
                        </div>
                        <div class="hero-content">
                            ${subtitleHtml}
                            ${titleHtml}
                            <div class="hero-cta" style="margin-top: 20px;">
                                <a href="${linkUrl}" class="btn btn-primary">${btnText}</a>
                            </div>
                        </div>
                    `;
                    slidesWrapper.appendChild(slideDiv);

                    if (dotsContainer && banners.length > 1) {
                        const dot = document.createElement('div');
                        dot.className = `hero-dot ${index === 0 ? 'active' : ''}`;
                        dot.dataset.index = index;
                        dot.addEventListener('click', () => goToSlide(index));
                        dotsContainer.appendChild(dot);
                    }
                });

                if (banners.length <= 1) {
                    if (prevBtn) prevBtn.style.display = 'none';
                    if (nextBtn) nextBtn.style.display = 'none';
                    if (dotsContainer) dotsContainer.style.display = 'none';
                    return;
                } else {
                    if (prevBtn) prevBtn.style.display = 'flex';
                    if (nextBtn) nextBtn.style.display = 'flex';
                    if (dotsContainer) dotsContainer.style.display = 'flex';
                }

                function goToSlide(index) {
                    const slides = slidesWrapper.querySelectorAll('.hero-slide');
                    const dots = dotsContainer ? dotsContainer.querySelectorAll('.hero-dot') : [];

                    slides.forEach(s => s.classList.remove('active'));
                    dots.forEach(d => d.classList.remove('active'));

                    currentSlideIndex = (index + slides.length) % slides.length;
                    slides[currentSlideIndex].classList.add('active');
                    if (dots[currentSlideIndex]) dots[currentSlideIndex].classList.add('active');
                }

                function startTimer() {
                    stopTimer();
                    slideInterval = setInterval(() => {
                        goToSlide(currentSlideIndex + 1);
                    }, 5000);
                }

                function stopTimer() {
                    if (slideInterval) clearInterval(slideInterval);
                }

                if (prevBtn) prevBtn.addEventListener('click', () => { goToSlide(currentSlideIndex - 1); startTimer(); });
                if (nextBtn) nextBtn.addEventListener('click', () => { goToSlide(currentSlideIndex + 1); startTimer(); });

                if (heroEl) {
                    heroEl.addEventListener('mouseenter', stopTimer);
                    heroEl.addEventListener('mouseleave', startTimer);
                }

                startTimer();
            }
        } catch (err) {
            console.error('Error loading hero banners:', err);
        }
    }

    async function loadCuratedCollections() {
        const container = document.getElementById('curated-collections');
        if (!container) return;

        try {
            const data = await fetchApi('/api/product-lists', { hideLoader: true });
            if (data && data.success && data.lists && data.lists.length > 0) {
                container.innerHTML = '';

                data.lists.forEach(list => {
                    if (!list.products || list.products.length === 0) return;

                    const section = document.createElement('section');
                    section.className = 'featured-products section bg-light';
                    section.style.borderTop = '1px solid var(--border-color)';

                    const badgeHtml = list.badgeText ? `<span class="chip-badge" style="font-size:0.85rem; padding: 4px 12px; margin-bottom: 10px; display:inline-block;">${list.badgeText}</span>` : '';
                    const descHtml = list.description ? `<p class="section-subtitle">${list.description}</p>` : '';

                    const productsHtml = list.products.map(renderProductCardHTML).join('');

                    section.innerHTML = `
                        <div class="container">
                            <div class="section-header animate-on-scroll" style="text-align: center;">
                                ${badgeHtml}
                                <h2>${list.title}</h2>
                                <div class="section-divider"></div>
                                ${descHtml}
                            </div>
                            <div class="product-grid animate-on-scroll">
                                ${productsHtml}
                            </div>
                        </div>
                    `;

                    container.appendChild(section);
                });

                attachProductListeners();
                if (window.observeElements) window.observeElements();
            }
        } catch (err) {
            console.error('Error loading curated collections:', err);
        }
    }
    
    // Announcement logic removed

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
                } else {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authUser');
                    if (loginBtn) loginBtn.classList.remove('hidden');
                    if (userProfile) userProfile.classList.add('hidden');
                    const cartBadge = document.querySelector('.cart-badge');
                    if (cartBadge) cartBadge.innerText = '0';
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
            
            // Initialize Google Login dynamically when modal opens
            if (window.google && window.google.accounts && !window.googleLoginInitialized) {
                const clientId = (import.meta && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) 
                    ? import.meta.env.VITE_GOOGLE_CLIENT_ID 
                    : "793576051211-qdgg0mbsld92ndoi6vmlmabksuob09sk.apps.googleusercontent.com";
                
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: window._actualGoogleLogin
                });
                window.google.accounts.id.renderButton(
                    document.getElementById("google-login-btn-container"),
                    { theme: "outline", size: "large", type: "standard" }
                );
                window.googleLoginInitialized = true;
            }
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

    // Chatbot logic removed
};
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
