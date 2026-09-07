document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const dropdownBtn = document.getElementById('categoryDropdownBtn');
  const categoryMenu = document.getElementById('categoryMenu');
  const searchInput = document.getElementById('searchInput');
  const categoryItems = document.querySelectorAll('#categoryMenu li');

  let activeCategory = 'all';

  // 1. Fetch live products from Supabase and render with favorite state
  await fetchAndDisplayProducts();

  // 2. Toggle Dropdown Menu
  if (dropdownBtn && categoryMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      categoryMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      categoryMenu.classList.remove('show');
    });
  }

  // 3. Category Selection Listener
  categoryItems.forEach((item) => {
    item.addEventListener('click', () => {
      activeCategory = item.getAttribute('data-category');
      dropdownBtn.textContent = `${item.textContent.trim()} ▾`;
      categoryMenu.classList.remove('show');
      filterProducts();
    });
  });

  // 4. Live Search Input Listener
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterProducts();
    });
  }

  // 5. Filter Products (Search + Category combined)
  function filterProducts() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const productCards = document.querySelectorAll('.product-grid .product-card');

    productCards.forEach((card) => {
      const cardCategory = (card.getAttribute('data-category') || '').toLowerCase();
      const cardTitle = card.querySelector('.card-title')?.textContent.toLowerCase() || '';

      const matchesCategory = activeCategory === 'all' || cardCategory === activeCategory.toLowerCase();
      const matchesSearch = cardTitle.includes(searchTerm);

      if (matchesCategory && matchesSearch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }
});

// Fetch & render live cards from Supabase with user favorite states and sold badges
async function fetchAndDisplayProducts() {
  const grid = document.querySelector('.product-grid') || document.getElementById('productsGrid');
  if (!grid) return;

  // Retrieve authenticated user
  const { data: { user } } = await window.supabase.auth.getUser();

  // Load products and active user favorites concurrently
  const [productsRes, favsRes] = await Promise.all([
    window.supabase.from('products').select('*').order('created_at', { ascending: false }),
    user ? window.supabase.from('favorites').select('product_id').eq('user_id', user.id) : Promise.resolve({ data: [] })
  ]);

  if (productsRes.error) {
    console.error('Error fetching products:', productsRes.error);
    grid.innerHTML = '<p class="empty-state">Unable to load products right now.</p>';
    return;
  }

  const products = productsRes.data;
  if (!products || products.length === 0) {
    grid.innerHTML = '<p class="empty-state">No products listed yet. Be the first to upload!</p>';
    return;
  }

  // Set for fast lookup of favorited products
  const userFavSet = new Set((favsRes.data || []).map(f => f.product_id));

  grid.innerHTML = products.map(product => {
    const isFav = userFavSet.has(product.id);
    const isSold = product.status === 'sold';

    return `
      <div class="card product-card ${isSold ? 'item-sold' : ''}" data-id="${product.id}" data-category="${escapeHtml(product.category || 'other')}" style="cursor: pointer;">
        <!-- Inset Rounded Image Frame -->
        <div class="card-img-container">
          <img 
            src="${product.image_front_url || 'https://via.placeholder.com/300x200?text=No+Photo'}" 
            alt="${escapeHtml(product.title)}" 
            class="card-img"
            loading="lazy"
          />
          ${isSold ? '<span class="sold-badge-overlay">SOLD</span>' : ''}
        </div>

        <!-- Card Details -->
        <div class="card-body">
          <h4 class="card-title">${escapeHtml(product.title)}</h4>
          <p class="card-location">📍 ${escapeHtml(product.location || 'Campus')}</p>

          <!-- Footer: Blue Price on Left, Heart + Message on Right -->
          <div class="card-footer">
            <span class="card-price">฿${Number(product.price).toLocaleString()}</span>
            <div class="card-actions">
              <button 
                class="btn-icon fav-btn ${isFav ? 'active' : ''}" 
                data-id="${product.id}" 
                title="${isFav ? 'Remove Favorite' : 'Save to Favorites'}"
              >${isFav ? '💖' : '❤️'}</button>
              <a href="messages.html" class="btn-icon msg-btn" title="Message Seller">💬</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Make cards clickable to open product details
  document.querySelectorAll('.product-grid .product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Avoid triggering navigation when clicking the heart or message buttons
      if (e.target.closest('.card-actions')) return;
      const id = card.getAttribute('data-id');
      window.location.href = `product.html?id=${id}`;
    });
  });

  // Attach database toggle to heart buttons
  setupFavoriteButtons(user);
}

// Database-backed Favorite Button Listener
function setupFavoriteButtons(user) {
  const favButtons = document.querySelectorAll('.fav-btn');

  favButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();

      if (!user) {
        alert('Please log in to save favorites!');
        window.location.href = 'login.html';
        return;
      }

      const productId = btn.getAttribute('data-id');
      const isCurrentlyFav = btn.classList.contains('active');

      // Optimistic UI toggle
      btn.disabled = true;
      btn.classList.toggle('active');
      btn.textContent = !isCurrentlyFav ? '💖' : '❤️';

      try {
        if (!isCurrentlyFav) {
          // Insert row into favorites table
          const { error } = await window.supabase
            .from('favorites')
            .insert([{ user_id: user.id, product_id: productId }]);

          if (error) throw error;
        } else {
          // Delete row from favorites table
          const { error } = await window.supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId);

          if (error) throw error;
        }
      } catch (err) {
        console.error('Favorite toggle error:', err);
        // Roll back if error occurs
        btn.classList.toggle('active');
        btn.textContent = isCurrentlyFav ? '💖' : '❤️';
        alert('Could not update favorite: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}