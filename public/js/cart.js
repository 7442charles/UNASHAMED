/**
 * Cart System - Client-side cart using localStorage
 * Items structured as: { id, name, price, image, quantity }
 */

const Cart = (function() {
    const STORAGE_KEY = 'unashamed_cart';

    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        updateBadge();
        renderCartDrawer();
    }

    function addItem(product) {
        const cart = getCart();
        const existing = cart.find(item => item.id === product.id);
        
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }
        
        saveCart(cart);
        showToast(`${product.name} added to cart!`);
    }

    function removeItem(productId) {
        const cart = getCart().filter(item => item.id !== productId);
        saveCart(cart);
    }

    function updateQuantity(productId, qty) {
        const cart = getCart();
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(1, qty);
            saveCart(cart);
        }
    }

    function getCartCount() {
        return getCart().reduce((sum, item) => sum + item.quantity, 0);
    }

    function getTotal() {
        return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    function clearCart() {
        saveCart([]);
    }

    // --- UI Helpers ---

    function updateBadge() {
        const badges = document.querySelectorAll('.cart-badge');
        const count = getCartCount();
        badges.forEach(badge => {
            badge.textContent = count;
            badge.classList.toggle('hidden', count === 0);
        });
    }

    function renderCartDrawer() {
        const container = document.getElementById('cart-items-container');
        const totalEl = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('cart-checkout-btn');
        const emptyMsg = document.getElementById('cart-empty-msg');
        
        if (!container) return;

        const cart = getCart();
        
        if (cart.length === 0) {
            container.innerHTML = '';
            if (emptyMsg) emptyMsg.classList.remove('hidden');
            if (totalEl) totalEl.textContent = 'KES 0';
            if (checkoutBtn) checkoutBtn.classList.add('hidden');
            return;
        }

        if (emptyMsg) emptyMsg.classList.add('hidden');
        if (checkoutBtn) checkoutBtn.classList.remove('hidden');

        container.innerHTML = cart.map(item => `
            <div class="flex gap-3 p-3 bg-gray-50 rounded-lg cart-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded flex-shrink-0">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold text-gray-900 truncate">${item.name}</h4>
                    <p class="text-sm text-gray-600">KES ${item.price.toLocaleString()}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <button class="qty-btn qty-minus w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-xs font-bold hover:bg-gray-300" data-id="${item.id}">−</button>
                        <span class="qty-value text-sm font-bold w-5 text-center">${item.quantity}</span>
                        <button class="qty-btn qty-plus w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-xs font-bold hover:bg-gray-300" data-id="${item.id}">+</button>
                        <button class="remove-item ml-auto text-red-500 hover:text-red-700" data-id="${item.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        if (totalEl) totalEl.textContent = `KES ${getTotal().toLocaleString()}`;

        // Attach event listeners for quantity and remove
        container.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = cart.find(i => i.id === id);
                if (item && item.quantity > 1) updateQuantity(id, item.quantity - 1);
                else removeItem(id);
            });
        });

        container.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = cart.find(i => i.id === id);
                if (item) updateQuantity(id, item.quantity + 1);
            });
        });

        container.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', () => {
                removeItem(parseInt(btn.dataset.id));
            });
        });
    }

    // --- Toast Notification ---
    function showToast(message) {
        const existing = document.querySelector('.cart-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'cart-toast fixed bottom-6 right-6 bg-black text-white px-6 py-3 rounded-lg shadow-2xl z-[100] text-sm font-bold animate-bounce';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    }

    // --- Init: Setup "Add to Cart" listeners ---
    function init() {
        // Listen for clicks on "Add to Cart" buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-to-cart-btn');
            if (!btn) return;

            const product = {
                id: parseInt(btn.dataset.id),
                name: btn.dataset.name,
                price: parseInt(btn.dataset.price),
                image: btn.dataset.image
            };
            
            addItem(product);
        });

        // Listen for "Buy Now" clicks: add to cart then redirect
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.buy-now-btn');
            if (!btn) return;
            e.preventDefault();

            const product = {
                id: parseInt(btn.dataset.id),
                name: btn.dataset.name,
                price: parseInt(btn.dataset.price),
                image: btn.dataset.image,
                quantity: 1
            };
            addItem(product);
            window.location.href = '/capture-lead';
        });

        // Cart drawer toggle
        const cartToggle = document.getElementById('cart-toggle');
        const cartDrawer = document.getElementById('cart-drawer');
        const cartOverlay = document.getElementById('cart-overlay');
        const cartClose = document.getElementById('cart-close');

        if (cartToggle && cartDrawer) {
            function openCart() {
                cartDrawer.classList.remove('translate-x-full');
                if (cartOverlay) cartOverlay.classList.remove('hidden');
                renderCartDrawer();
            }
            function closeCart() {
                cartDrawer.classList.add('translate-x-full');
                if (cartOverlay) cartOverlay.classList.add('hidden');
            }
            cartToggle.addEventListener('click', openCart);
            if (cartClose) cartClose.addEventListener('click', closeCart);
            if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
        }

        // Initial badge update
        updateBadge();
    }

    // Run init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        getCart,
        getCartCount,
        getTotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart
    };
})();

