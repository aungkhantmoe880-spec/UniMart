document.addEventListener('DOMContentLoaded', async () => {
  const checkSession = setInterval(async () => {
    if (window.currentUser) {
      clearInterval(checkSession);
      loadNavbarAvatar(window.currentUser.id);
      initMyListings(window.currentUser.id);
    }
  }, 50);
});

// Load student profile picture into top bar
async function loadNavbarAvatar(userId) {
  const avatarEl = document.getElementById('navUserAvatar');
  if (!avatarEl) return;

  try {
    const { data: profile } = await window.supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (profile?.avatar_url && profile.avatar_url.trim() !== '') {
      avatarEl.src = profile.avatar_url;
    }
  } catch (e) {
    console.warn('Navbar avatar error:', e);
  }
}

// Fetch & render user's posted listings
async function initMyListings(userId) {
  const container = document.getElementById('sellerListingsGrid');
  if (!container) return;

  const { data: products, error } = await window.supabase
    .from('products')
    .select('*')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load listings:', error);
    container.innerHTML = '<p class="col-span-full text-center py-20 text-sm text-tertiary">Failed to load listings. Please reload.</p>';
    return;
  }

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-20 text-center gap-3">
        <span class="material-symbols-outlined text-5xl text-outline">inventory_2</span>
        <h3 class="text-base font-bold text-on-surface">No products listed yet</h3>
        <p class="text-xs text-on-surface-variant max-w-sm">Items you list for sale across campus will appear here for you to manage or edit.</p>
        <a href="upload.html" class="mt-2 h-10 px-5 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm">
          <span class="material-symbols-outlined text-base">add</span>
          <span>Upload Item</span>
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => {
    const isSold = p.status === 'sold';
    const condition = (p.condition || 'Good').toUpperCase();

    return `
      <article class="group relative flex flex-col bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md border border-surface-container overflow-hidden transition-all ${isSold ? 'opacity-80' : ''}" id="listing-${p.id}">
        
        <div class="relative aspect-[4/3] w-full bg-surface-container overflow-hidden">
          <img 
            src="${p.image_front_url || 'https://via.placeholder.com/400x300?text=No+Photo'}" 
            alt="${escapeHtml(p.title)}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          
          <div class="absolute top-2.5 left-2.5 flex gap-1">
            <span class="px-2 py-0.5 rounded-md bg-surface-container-lowest/90 backdrop-blur-sm text-[10px] font-bold text-primary shadow-xs">
              ${escapeHtml(condition)}
            </span>
          </div>

          ${isSold ? `
            <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
              <span class="px-3 py-1 bg-error-container text-on-error-container text-xs font-bold rounded-lg uppercase tracking-wider">SOLD</span>
            </div>
          ` : ''}
        </div>

        <div class="p-3 sm:p-4 flex flex-col flex-grow justify-between gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-base sm:text-lg font-bold text-on-surface block leading-tight">
              ฿${Number(p.price || 0).toLocaleString()}
            </span>
            <h2 class="text-xs sm:text-sm text-on-surface line-clamp-1 font-semibold group-hover:text-primary transition-colors mt-0.5">
              ${escapeHtml(p.title)}
            </h2>
            <div class="flex items-center gap-1 text-on-surface-variant text-[11px] mt-0.5">
              <span class="material-symbols-outlined text-xs text-primary shrink-0">location_on</span>
              <span class="truncate">${escapeHtml(p.location || 'Campus')}</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-1.5 pt-2 border-t border-surface-container/60">
            <button 
              type="button" 
              class="btn-toggle-sold h-8 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${isSold ? 'bg-surface-container text-on-surface hover:bg-surface-container-high' : 'bg-primary-fixed/60 text-primary hover:bg-primary-fixed'}" 
              data-id="${p.id}" 
              data-status="${p.status || 'available'}"
              title="${isSold ? 'Relist Item' : 'Mark as Sold'}"
            >
              <span class="material-symbols-outlined text-sm">${isSold ? 'refresh' : 'check_circle'}</span>
              <span>${isSold ? 'Relist' : 'Sold'}</span>
            </button>

            <!-- Navigates directly to upload.html in edit mode -->
            <button 
              type="button" 
              class="btn-edit-listing h-8 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors" 
              data-id="${p.id}"
              title="Edit in Sell an Item"
            >
              <span class="material-symbols-outlined text-sm">edit</span>
              <span>Edit</span>
            </button>

            <button 
              type="button" 
              class="btn-delete-listing h-8 px-2 rounded-lg bg-tertiary-fixed/30 hover:bg-tertiary-fixed/60 text-tertiary text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors" 
              data-id="${p.id}"
              title="Delete Listing"
            >
              <span class="material-symbols-outlined text-sm">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  setupActionHandlers(userId);
}

function setupActionHandlers(userId) {
  const container = document.getElementById('sellerListingsGrid');

  // 1. Toggle Sold / Available Status
  container.querySelectorAll('.btn-toggle-sold').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-id');
      const currentStatus = btn.getAttribute('data-status');
      const newStatus = currentStatus === 'sold' ? 'available' : 'sold';

      btn.disabled = true;
      const { error } = await window.supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId)
        .eq('seller_id', userId);

      if (error) {
        alert('Could not update status: ' + error.message);
        btn.disabled = false;
        return;
      }

      await initMyListings(userId);
    });
  });

  // 2. Direct Redirect to Sell an Item section with preloaded details
  container.querySelectorAll('.btn-edit-listing').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-id');
      window.location.href = `upload.html?edit=${productId}`;
    });
  });

  // 3. Delete Listing
  container.querySelectorAll('.btn-delete-listing').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-id');

      if (!confirm('Are you sure you want to delete this listing and its photos permanently?')) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>';

      try {
        const { data: product } = await window.supabase
          .from('products')
          .select('image_front_url, image_back_url, image_left_url, image_right_url')
          .eq('id', productId)
          .single();

        if (product) {
          const bucketName = 'product-images';
          const imageUrls = [
            product.image_front_url,
            product.image_back_url,
            product.image_left_url,
            product.image_right_url
          ].filter(url => Boolean(url && url.includes(bucketName)));

          const filesToDelete = imageUrls.map(url => {
            const parts = url.split(`/${bucketName}/`);
            return parts.length > 1 ? parts[1].split('?')[0] : null;
          }).filter(Boolean);

          if (filesToDelete.length > 0) {
            await window.supabase.storage.from(bucketName).remove(filesToDelete);
          }
        }

        await window.supabase.from('favorites').delete().eq('product_id', productId);

        const { error: deleteErr } = await window.supabase
          .from('products')
          .delete()
          .eq('id', productId)
          .eq('seller_id', userId);

        if (deleteErr) throw deleteErr;

        await initMyListings(userId);
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Could not delete product: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm">delete</span><span>Delete</span>';
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