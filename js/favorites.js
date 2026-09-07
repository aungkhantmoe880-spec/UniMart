document.addEventListener('DOMContentLoaded', async () => {
  const checkSession = setInterval(async () => {
    if (window.currentUser) {
      clearInterval(checkSession);
      initFavoritesPage();
    }
  }, 50);
});

async function initFavoritesPage() {
  const container = document.getElementById('favoritesFullGrid');
  const userId = window.currentUser.id;

  const { data: favs, error } = await window.supabase
    .from('favorites')
    .select('product_id, products(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error);
    container.innerHTML = '<p class="empty-state">Unable to load favorites.</p>';
    return;
  }

  const validProducts = (favs || []).map(f => f.products).filter(Boolean);

  if (validProducts.length === 0) {
    container.innerHTML = '<p class="empty-state">You have no saved favorites yet. Browse the marketplace and tap ❤️!</p>';
    return;
  }

  container.innerHTML = validProducts.map(p => `
    <div class="card product-card">
      <div class="card-img-container">
        <img 
          src="${p.image_front_url || 'https://via.placeholder.com/300x200?text=No+Photo'}" 
          alt="${escapeHtml(p.title)}" 
          class="card-img"
          loading="lazy"
        />
      </div>
      <div class="card-body">
        <h4 class="card-title">${escapeHtml(p.title)}</h4>
        <p class="card-location">📍 ${escapeHtml(p.location || 'Campus')}</p>
        <div class="card-footer">
          <span class="card-price">฿${Number(p.price).toLocaleString()}</span>
          <div class="card-actions">
            <button class="btn-icon remove-fav-btn" data-id="${p.id}" title="Remove">🗑️</button>
            <a href="messages.html" class="btn-icon msg-btn" title="Message Seller">💬</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.remove-fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const prodId = btn.getAttribute('data-id');
      await window.supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', prodId);
      
      initFavoritesPage();
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