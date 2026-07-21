import { API_BASE } from './config.js';

/**
 * Helper to perform API requests with auth token
 * @param {string} endpoint - The API endpoint starting with /
 * @param {object} options - Fetch options (method, body, headers, etc)
 * @returns {Promise<any>}
 */
export async function fetchApi(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add authorization if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Some requests like FormData shouldn't have Content-Type set manually
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    try {
        if (window.showLoader && !options.hideLoader) {
            window.showLoader(options.loaderText || 'Loading...');
        }
        
        const res = await fetch(API_BASE + endpoint, {
            ...options,
            headers
        });
        
        const data = await res.json();
        return data;
    } catch (e) {
        console.error('API Error:', e);
        return null;
    } finally {
        if (window.hideLoader && !options.hideLoader) {
            window.hideLoader();
        }
    }
}
