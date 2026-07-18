document.addEventListener('DOMContentLoaded', () => {
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

    // --- Wishlist Interaction ---
    const wishlistBtns = document.querySelectorAll('.action-btn[title="Add to Wishlist"]');
    
    wishlistBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent jump to top if inside link
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            
            if (btn.classList.contains('active')) {
                icon.classList.replace('ph-heart', 'ph-heart-fill');
                icon.style.color = '#8C2131'; // Primary color
            } else {
                icon.classList.replace('ph-heart-fill', 'ph-heart');
                icon.style.color = '';
            }
        });
    });

    // --- Newsletter Form ---
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = newsletterForm.querySelector('input');
            if (input.value) {
                alert('Thank you for subscribing to Aaranya! You will receive our latest updates soon.');
                input.value = '';
            }
        });
    }

    // --- Add to Cart Interaction ---
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    const cartBadge = document.querySelector('.cart-badge');
    let cartCount = parseInt(cartBadge.innerText);

    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            cartCount++;
            cartBadge.innerText = cartCount;
            
            // Simple animation
            cartBadge.style.transform = 'scale(1.5)';
            setTimeout(() => {
                cartBadge.style.transform = 'scale(1)';
            }, 200);
            
            // Change button text temporarily
            const originalText = btn.innerText;
            btn.innerText = 'Added!';
            btn.style.backgroundColor = 'var(--accent-color)';
            btn.style.color = 'white';
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }, 2000);
        });
    });

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

    let tempGoogleData = null; // Store temp data during registration

    // Check if user is already logged in on page load
    const checkAuthStatus = () => {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('authUser');
        
        if (token && userStr) {
            const user = JSON.parse(userStr);
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');
            userNameDisplay.innerText = user.username;
            if (user.picture) userAvatar.src = user.picture;
        } else {
            loginBtn.classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
    };
    checkAuthStatus();

    // Modal toggles
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.classList.remove('hidden');
    });

    closeLoginBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        checkAuthStatus();
        alert('You have been logged out.');
    });

    // Global callback for Google Sign-In
    window.handleGoogleLogin = async (response) => {
        const token = response.credential;
        
        try {
            // Send token to backend
            const res = await fetch('http://localhost:5000/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const data = await res.json();
            
            if (data.success) {
                if (data.isNewUser) {
                    // New user: hide login modal, show username prompt
                    loginModal.classList.add('hidden');
                    usernameModal.classList.remove('hidden');
                    tempGoogleData = data.googleData;
                } else {
                    // Existing user: save token, update UI, close modal
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

    // Handle Username Submission
    usernameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username-input').value;
        
        if (!tempGoogleData) return alert('Session expired, please try logging in again.');
        
        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    googleId: tempGoogleData.googleId,
                    email: tempGoogleData.email,
                    picture: tempGoogleData.picture,
                    username: username
                })
            });
            
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('authUser', JSON.stringify(data.user));
                checkAuthStatus();
                usernameModal.classList.add('hidden');
                tempGoogleData = null;
                alert('Welcome to Aaranya, ' + data.user.username + '!');
            } else {
                alert(data.message || 'Registration failed.');
            }
        } catch (error) {
            console.error('Registration Error:', error);
            alert('A network error occurred.');
        }
    });

});
