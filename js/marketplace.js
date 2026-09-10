let allProducts = [];
let activeCategory = 'all';
let filterMinPrice = null;
let filterMaxPrice = null;
let selectedConditions = new Set();
let currentSort = 'newest';
let userFavSet = new Set();
let authenticatedUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial Data Fetch
  await initMarketplaceData();

  // 2. Setup Desktop & Mobile Listeners
  setupCategoryListeners();
  setupSearchListener();
  setupSortListener();
  setupPriceFilterListeners();
  setupConditionListeners();
  setupMobileDrawer();
  setupUserProfileHeader();
});

// Fetch products & favorite relationships from Supabase
async function initMarketplaceData() {
  const grid = document.getElementById('productsGrid');

  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    authenticatedUser = user;

    const [productsRes, favsRes] = await Promise.all([
      window.supabase.from('products').select('*').order('created_at', { ascending: false }),
      user ? window.supabase.from('favorites').select('product_id').eq('user_id', user.id) : Promise.resolve({ data: [] })
    ]);

    if (productsRes.error) throw productsRes.error;

    allProducts = productsRes.data || [];
    userFavSet = new Set((favsRes.data || []).map(f => f.product_id));

    // Update active count summary
    const countEl = document.getElementById('statActivePosts');
    if (countEl) countEl.textContent = allProducts.length;

    renderFilteredProducts();
  } catch (err) {
    console.error('Marketplace init error:', err);
    if (grid) {
      grid.innerHTML = '<p class="col-span-full text-center py-16 text-sm text-tertiary">Failed to load listings. Please refresh.</p>';
    }
  }
}

// Master rendering function with search, category, price, and condition filtering
function renderFilteredProducts() {
  const grid = document.getElementById('productsGrid');
  const countSummary = document.getElementById('resultsCountSummary');
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let filtered = allProducts.filter(p => {
    // 1. Category Filter
    const cat = (p.category || 'other').toLowerCase();
    if (activeCategory !== 'all' && cat !== activeCategory.toLowerCase()) {
      return false;
    }

    // 2. Search Term Filter
    const title = (p.title || '').toLowerCase();
    const location = (p.location || '').toLowerCase();
    if (searchTerm && !title.includes(searchTerm) && !location.includes(searchTerm)) {
      return false;
    }

    // 3. Price Filter
    const price = Number(p.price) || 0;
    if (filterMinPrice !== null && price < filterMinPrice) return false;
    if (filterMaxPrice !== null && price > filterMaxPrice) return false;

    // 4. Condition Filter
    if (selectedConditions.size > 0) {
      const condition = (p.condition || '').toLowerCase();
      if (!selectedConditions.has(condition)) return false;
    }

    return true;
  });

  // Sort logic
  if (currentSort === 'price-asc') {
    filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (currentSort === 'price-desc') {
    filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else {
    // Newest first default
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // Update counter
  if (countSummary) {
    countSummary.textContent = `Showing 1–${filtered.length} of ${allProducts.length} items`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-16 text-center text-on-surface-variant">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
        <p class="font-semibold">No items match your criteria</p>
        <span class="text-xs text-outline">Try clearing filters or search terms.</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const isFav = userFavSet.has(product.id);
    const isSold = product.status === 'sold';
    const condition = (product.condition || 'Good').toUpperCase();

    return `
      <article 
        class="group relative flex flex-col bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md border border-surface-container transition-all overflow-hidden cursor-pointer ${isSold ? 'opacity-75' : ''}" 
        data-id="${product.id}"
      >
        <!-- Product Photo Frame -->
        <div class="relative aspect-[4/3] w-full bg-surface-container overflow-hidden">
          <img 
            src="${product.image_front_url || 'https://via.placeholder.com/400x300?text=No+Photo'}" 
            alt="${escapeHtml(product.title)}"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          <!-- Condition Badge -->
          <div class="absolute top-2.5 left-2.5 flex gap-1">
            <span class="px-2 py-0.5 rounded-md bg-surface-container-lowest/90 backdrop-blur-sm text-[10px] sm:text-xs font-bold text-primary shadow-xs">
              ${escapeHtml(condition)}
            </span>
          </div>

          <!-- Favorite Button -->
          <button 
            type="button"
            class="fav-toggle-btn absolute top-2.5 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center shadow-xs transition-colors ${isFav ? 'text-tertiary' : 'text-outline hover:text-tertiary'}"
            data-id="${product.id}"
            aria-label="Add to favorites"
          >
            <span class="material-symbols-outlined text-base sm:text-lg ${isFav ? 'fill-1' : ''}">favorite</span>
          </button>

          <!-- Sold Overlay -->
          ${isSold ? `
            <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
              <span class="px-3 py-1 bg-error-container text-on-error-container text-xs sm:text-sm font-bold rounded-lg uppercase tracking-wider">SOLD</span>
            </div>
          ` : ''}
        </div>

        <!-- Card Content Body -->
        <div class="p-3 sm:p-4 flex flex-col flex-grow justify-between gap-2">
          <div>
            <span class="text-base sm:text-lg font-bold text-on-surface block leading-tight">
              ฿${Number(product.price || 0).toLocaleString()}
            </span>
            <h2 class="text-xs sm:text-sm text-on-surface line-clamp-1 font-semibold group-hover:text-primary transition-colors mt-0.5">
              ${escapeHtml(product.title)}
            </h2>
          </div>

          <div class="flex items-center justify-between text-on-surface-variant pt-1 border-t border-surface-container/60">
            <div class="flex items-center gap-1 min-w-0">
              <span class="material-symbols-outlined text-xs sm:text-sm text-primary shrink-0">location_on</span>
              <span class="truncate text-[11px]">${escapeHtml(product.location || 'Campus')}</span>
            </div>
            <span class="text-[10px] text-outline shrink-0">
              ${product.is_negotiable ? 'Negotiable' : 'Fixed'}
            </span>
          </div>
        </div>
      </article>
    `;
  }).join('');

  attachCardInteractions();
}

// Attach click listeners to cards & favorites
function attachCardInteractions() {
  // Navigate to Detail Page
  document.querySelectorAll('#productsGrid article').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.fav-toggle-btn')) return;
      const id = card.getAttribute('data-id');
      window.location.href = `product.html?id=${id}`;
    });
  });

  // Favorite Heart Toggle
  document.querySelectorAll('.fav-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-id');

      if (!authenticatedUser) {
        alert('Please log in to bookmark favorites.');
        window.location.href = 'login.html';
        return;
      }

      const icon = btn.querySelector('.material-symbols-outlined');
      const isFav = userFavSet.has(productId);

      // Optimistic UI
      if (isFav) {
        userFavSet.delete(productId);
        btn.classList.remove('text-tertiary');
        btn.classList.add('text-outline');
        icon?.classList.remove('fill-1');
      } else {
        userFavSet.add(productId);
        btn.classList.add('text-tertiary');
        btn.classList.remove('text-outline');
        icon?.classList.add('fill-1');
      }

      try {
        if (!isFav) {
          await window.supabase.from('favorites').insert([{ user_id: authenticatedUser.id, product_id: productId }]);
        } else {
          await window.supabase.from('favorites').delete().eq('user_id', authenticatedUser.id).eq('product_id', productId);
        }
      } catch (err) {
        console.error('Favorite persistence error:', err);
      }
    });
  });
}

// Category Listeners (Desktop + Mobile Sync)
function setupCategoryListeners() {
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      activeCategory = pill.getAttribute('data-category');

      // Sync active classes across desktop sidebar and mobile horizontal scroll
      document.querySelectorAll('.category-pill').forEach(p => {
        if (p.getAttribute('data-category') === activeCategory) {
          p.classList.add('active', 'bg-primary', 'text-on-primary');
          p.classList.remove('bg-surface-container-lowest', 'text-on-surface-variant');
        } else {
          p.classList.remove('active', 'bg-primary', 'text-on-primary');
          p.classList.add('bg-surface-container-lowest', 'text-on-surface-variant');
        }
      });

      renderFilteredProducts();
    });
  });
}

// Real-time Search Listener
function setupSearchListener() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderFilteredProducts();
    });
  }
}

// Sort Order Listener
function setupSortListener() {
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderFilteredProducts();
    });
  }
}

// Price Filter Listeners
function setupPriceFilterListeners() {
  const minInput = document.getElementById('priceMinInput');
  const maxInput = document.getElementById('priceMaxInput');
  const goBtn = document.getElementById('priceFilterGoBtn');

  if (goBtn) {
    goBtn.addEventListener('click', () => {
      filterMinPrice = minInput.value ? parseFloat(minInput.value) : null;
      filterMaxPrice = maxInput.value ? parseFloat(maxInput.value) : null;
      renderFilteredProducts();
    });
  }

  // Mobile quick price buttons
  document.querySelectorAll('.mobile-price-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterMinPrice = parseFloat(btn.getAttribute('data-min'));
      filterMaxPrice = parseFloat(btn.getAttribute('data-max'));
      renderFilteredProducts();
    });
  });

  // Clear filters
  const resetHandler = () => {
    activeCategory = 'all';
    filterMinPrice = null;
    filterMaxPrice = null;
    selectedConditions.clear();
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.condition-filter').forEach(c => c.checked = false);
    setupCategoryListeners();
    renderFilteredProducts();
  };

  document.getElementById('desktopClearFiltersBtn')?.addEventListener('click', resetHandler);
  document.getElementById('mobileClearFiltersBtn')?.addEventListener('click', resetHandler);
}

// Condition Checkboxes
function setupConditionListeners() {
  document.querySelectorAll('.condition-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        selectedConditions.add(cb.value.toLowerCase());
      } else {
        selectedConditions.delete(cb.value.toLowerCase());
      }
      renderFilteredProducts();
    });
  });
}

// Mobile Filter Drawer Toggle
function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobileFilterToggleBtn');
  const drawer = document.getElementById('mobileFilterDrawer');

  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', () => {
      drawer.classList.toggle('hidden');
      drawer.classList.toggle('flex');
    });
  }
}

// Header Profile Avatar & Display Name
async function setupUserProfileHeader() {
  const avatarImg = document.getElementById('navUserAvatar');
  const nameEl = document.getElementById('navUserName');

  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await window.supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (profile) {
    if (nameEl && profile.full_name) nameEl.textContent = profile.full_name.split(' ')[0];
    if (avatarImg && profile.avatar_url) avatarImg.src = profile.avatar_url;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}