let myProducts = [];
let currentUserId = null;
let activeFilter = 'all';
let editPendingImages = {
  front: null,
  back: null,
  left: null,
  right: null
};

document.addEventListener('DOMContentLoaded', async () => {
  // Session check loop
  const checkSession = setInterval(async () => {
    if (window.currentUser) {
      clearInterval(checkSession);
      currentUserId = window.currentUser.id;
      loadNavbarAvatar(currentUserId);
      await initInventory(currentUserId);
    }
  }, 50);

  setupSearchAndTabs();
  setupEditModalHooks();
});

// Load authenticated avatar into top navbar
async function loadNavbarAvatar(userId) {
  const avatarImg = document.getElementById('navUserAvatar');
  if (!avatarImg) return;

  try {
    const { data: profile } = await window.supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (profile?.avatar_url && profile.avatar_url.trim() !== '') {
      avatarImg.src = profile.avatar_url;
    }
  } catch (err) {
    console.warn('Navbar profile avatar fetch error:', err);
  }
}

// Master Fetch for Seller's Inventory
async function initInventory(userId) {
  const grid = document.getElementById('sellerListingsGrid');

  try {
    const { data: products, error } = await window.supabase
      .from('products')
      .select('*')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    myProducts = products || [];
    updateMetrics();
    renderInventoryCards();
  } catch (err) {
    console.error('Failed to load inventory:', err);
    if (grid) {
      grid.innerHTML = '<p class="col-span-full text-center py-16 text-sm text-tertiary">Unable to load inventory. Please refresh.</p>';
    }
  }
}

// Update Top Stat Counters & Tab Numbers
function updateMetrics() {
  const total = myProducts.length;
  const sold = myProducts.filter(p => p.status === 'sold').length;
  const active = total - sold;

  document.getElementById('statTotalCount').textContent = total;
  document.getElementById('statActiveCount').textContent = active;
  document.getElementById('statSoldCount').textContent = sold;

  document.getElementById('tabCountAll').textContent = total;
  document.getElementById('tabCountActive').textContent = active;
  document.getElementById('tabCountSold').textContent = sold;
}

// Render Products According to Filter, Search, and Sort
function renderInventoryCards() {
  const grid = document.getElementById('sellerListingsGrid');
  const searchInput = document.getElementById('searchListingsInput');
  const sortSelect = document.getElementById('sortListingsSelect');

  const query = (searchInput?.value || '').toLowerCase().trim();
  const sortMode = sortSelect?.value || 'newest';

  let filtered = myProducts.filter(p => {
    // 1. Status Tab
    const isSold = p.status === 'sold';
    if (activeFilter === 'active' && isSold) return false;
    if (activeFilter === 'sold' && !isSold) return false;

    // 2. Search
    const title = (p.title || '').toLowerCase();
    const loc = (p.location || '').toLowerCase();
    if (query && !title.includes(query) && !loc.includes(query)) return false;

    return true;
  });

  // Sort
  if (sortMode === 'price-low') {
    filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (sortMode === 'price-high') {
    filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-16 text-center text-on-surface-variant">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">inventory_2</span>
        <p class="font-semibold text-sm">No inventory items found</p>
        <span class="text-xs text-outline">Post your items or adjust search filters.</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const isSold = p.status === 'sold';
    const category = (p.category || 'General').toUpperCase();

    return `
      <article class="flex flex-col bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-surface-container hover:shadow-md transition-all relative overflow-hidden group">
        
        <!-- Image & Badges -->
        <div class="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center">
          <img 
            src="${p.image_front_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23f1f3ff" width="300" height="300"/%3E%3Ctext fill="%23707881" font-family="sans-serif" font-size="16" dy="5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Photo%3C/text%3E%3C/svg%3E'}" 
            alt="${escapeHtml(p.title)}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          <span class="absolute top-1.5 left-1.5 bg-inverse-surface/80 text-inverse-on-surface text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
            ${escapeHtml(category)}
          </span>

          <span class="absolute top-1.5 right-1.5 ${isSold ? 'bg-error-container text-tertiary font-bold' : 'bg-surface-container-lowest/90 text-primary font-semibold'} text-[10px] px-1.5 py-0.5 rounded-full shadow-xs">
            ${isSold ? 'Sold' : 'Active'}
          </span>

          <!-- Sold Overlay -->
          ${isSold ? `
            <div class="absolute inset-0 bg-inverse-surface/60 backdrop-blur-[1px] flex items-center justify-center p-2 z-10">
              <div class="px-3 py-1 rounded-md bg-error-container text-tertiary text-xs font-bold tracking-wider uppercase shadow-md">
                SOLD
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Information -->
        <div class="pt-2 flex flex-col flex-grow justify-between gap-1.5">
          <div>
            <h3 class="text-xs sm:text-sm font-semibold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
              ${escapeHtml(p.title)}
            </h3>
            <div class="flex items-center gap-1 text-on-surface-variant text-[11px] mt-0.5">
              <span class="material-symbols-outlined text-[13px] text-primary">location_on</span>
              <span class="truncate">${escapeHtml(p.location || 'Campus')}</span>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-sm font-bold text-primary">฿${Number(p.price || 0).toLocaleString()}</span>
              ${p.is_negotiable ? '<span class="text-[10px] text-secondary font-semibold">Negotiable</span>' : '<span class="text-[10px] text-outline">Fixed</span>'}
            </div>
          </div>

          <!-- Action Controls Toolbar -->
          <div class="grid grid-cols-3 gap-1 pt-1.5 border-t border-surface-container/60 mt-1">
            <button 
              type="button" 
              class="btn-status-toggle flex flex-col items-center justify-center py-1 rounded bg-surface-container text-primary hover:bg-primary hover:text-on-primary transition-colors shadow-xs"
              data-id="${p.id}"
              data-status="${p.status || 'available'}"
              title="${isSold ? 'Relist Item' : 'Mark as Sold'}"
            >
              <span class="material-symbols-outlined text-[15px]">${isSold ? 'refresh' : 'check_circle'}</span>
              <span class="text-[9px] font-semibold mt-0.5">${isSold ? 'Relist' : 'Sold'}</span>
            </button>

            <button 
              type="button" 
              class="btn-open-edit flex flex-col items-center justify-center py-1 rounded bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors shadow-xs"
              data-id="${p.id}"
              title="Edit Product & Photos"
            >
              <span class="material-symbols-outlined text-[15px]">edit</span>
              <span class="text-[9px] font-semibold mt-0.5">Edit</span>
            </button>

            <button 
              type="button" 
              class="btn-delete flex flex-col items-center justify-center py-1 rounded bg-surface-container-low text-tertiary hover:bg-error-container transition-colors shadow-xs"
              data-id="${p.id}"
              title="Delete Product"
            >
              <span class="material-symbols-outlined text-[15px]">delete</span>
              <span class="text-[9px] font-semibold mt-0.5">Del</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  attachActionListeners();
}

// Attach Event Listeners to Buttons
function attachActionListeners() {
  const container = document.getElementById('sellerListingsGrid');

  // 1. Mark Sold / Relist Toggle
  container.querySelectorAll('.btn-status-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const prodId = btn.getAttribute('data-id');
      const currentStatus = btn.getAttribute('data-status');
      const nextStatus = currentStatus === 'sold' ? 'available' : 'sold';

      btn.disabled = true;

      try {
        const { error } = await window.supabase
          .from('products')
          .update({ status: nextStatus })
          .eq('id', prodId)
          .eq('seller_id', currentUserId); // Database row update

        if (error) throw error;

        showToast(nextStatus === 'sold' ? 'Item marked as Sold!' : 'Item relisted to marketplace!', 'check_circle');
        await initInventory(currentUserId);
      } catch (err) {
        console.error('Status update error:', err);
        alert('Could not update status: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    });
  });

  // 2. Open Edit Modal with Complete Information & Photos
  container.querySelectorAll('.btn-open-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prodId = btn.getAttribute('data-id');
      const product = myProducts.find(p => p.id === prodId);
      if (product) openEditModal(product);
    });
  });

  // 3. Delete Product with Supabase Storage File Removal[cite: 27]
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const prodId = btn.getAttribute('data-id');

      if (!confirm('Are you sure you want to permanently delete this listing and its photos?')) return;

      btn.disabled = true;

      try {
        const product = myProducts.find(p => p.id === prodId);

        // Delete associated photos from Storage bucket[cite: 27]
        if (product) {
          const bucket = 'product-images';
          const urls = [
            product.image_front_url,
            product.image_back_url,
            product.image_left_url,
            product.image_right_url
          ].filter(u => Boolean(u && u.includes(bucket)));

          const paths = urls.map(u => {
            const split = u.split(`/${bucket}/`);
            return split.length > 1 ? split[1].split('?')[0] : null;
          }).filter(Boolean);

          if (paths.length > 0) {
            await window.supabase.storage.from(bucket).remove(paths); // Storage cleanup[cite: 27]
          }
        }

        // Delete favorites linked to this product[cite: 27]
        await window.supabase.from('favorites').delete().eq('product_id', prodId);

        // Delete database record[cite: 27]
        const { error: delErr } = await window.supabase
          .from('products')
          .delete()
          .eq('id', prodId)
          .eq('seller_id', currentUserId);

        if (delErr) throw delErr;

        showToast('Listing removed permanently.', 'delete');
        await initInventory(currentUserId);
      } catch (err) {
        console.error('Delete error:', err);
        alert('Could not delete product: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

// Setup Search and Filter Tabs
function setupSearchAndTabs() {
  const searchInput = document.getElementById('searchListingsInput');
  const sortSelect = document.getElementById('sortListingsSelect');
  const tabs = document.querySelectorAll('.filter-tab');

  searchInput?.addEventListener('input', () => renderInventoryCards());
  sortSelect?.addEventListener('change', () => renderInventoryCards());

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('bg-surface-container-lowest', 'text-primary', 'shadow-sm', 'font-semibold');
        t.classList.add('text-on-surface-variant', 'font-medium');
      });

      tab.classList.add('bg-surface-container-lowest', 'text-primary', 'shadow-sm', 'font-semibold');
      tab.classList.remove('text-on-surface-variant', 'font-medium');

      activeFilter = tab.getAttribute('data-filter');
      renderInventoryCards();
    });
  });
}

// Open and Populate Edit Modal
function openEditModal(product) {
  const modal = document.getElementById('editListingModal');
  const dialog = document.getElementById('editModalDialog');

  document.getElementById('editProductId').value = product.id;
  document.getElementById('editTitle').value = product.title || '';
  document.getElementById('editCategory').value = product.category || 'other';
  document.getElementById('editPrice').value = product.price || 0;
  document.getElementById('editNegotiable').checked = Boolean(product.is_negotiable);
  document.getElementById('editLocation').value = product.location || '';
  document.getElementById('editDescription').value = product.description || '';

  // Reset pending file replacements
  editPendingImages = { front: null, back: null, left: null, right: null };

  // Populate Image Previews
  setupSlotPreview('Front', product.image_front_url);
  setupSlotPreview('Back', product.image_back_url);
  setupSlotPreview('Left', product.image_left_url);
  setupSlotPreview('Right', product.image_right_url);

  modal.classList.remove('opacity-0', 'pointer-events-none');
  dialog.classList.remove('scale-95');
  dialog.classList.add('scale-100');
}

function setupSlotPreview(slotKey, existingUrl) {
  const preview = document.getElementById(`editPreview${slotKey}`);
  const placeholder = document.getElementById(`editPlaceholder${slotKey}`);
  const input = document.getElementById(`editImg${slotKey}`);

  input.value = ''; // Reset native input file

  if (existingUrl && existingUrl.trim() !== '') {
    preview.src = existingUrl;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    preview.src = '';
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      editPendingImages[slotKey.toLowerCase()] = file;
      const reader = new FileReader();
      reader.onload = (evt) => {
        preview.src = evt.target.result;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }
  };
}

function closeEditModal() {
  const modal = document.getElementById('editListingModal');
  const dialog = document.getElementById('editModalDialog');
  modal.classList.add('opacity-0', 'pointer-events-none');
  dialog.classList.add('scale-95');
  dialog.classList.remove('scale-100');
}

// Edit Form Submission and Photo Upload Execution
function setupEditModalHooks() {
  document.getElementById('btnCancelEdit')?.addEventListener('click', closeEditModal);
  document.getElementById('btnCancelEditBottom')?.addEventListener('click', closeEditModal);

  const modal = document.getElementById('editListingModal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeEditModal();
  });

  const form = document.getElementById('editListingForm');
  const saveBtn = document.getElementById('btnSaveEdit');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const currentProduct = myProducts.find(p => p.id === id);
    if (!currentProduct) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving...';

    try {
      // 1. Upload any newly selected photos to Supabase Storage[cite: 30]
      let frontUrl = currentProduct.image_front_url;
      let backUrl = currentProduct.image_back_url;
      let leftUrl = currentProduct.image_left_url;
      let rightUrl = currentProduct.image_right_url;

      if (editPendingImages.front) frontUrl = await uploadProductImage(editPendingImages.front, 'front'); // upload helper[cite: 30]
      if (editPendingImages.back) backUrl = await uploadProductImage(editPendingImages.back, 'back'); // upload helper[cite: 30]
      if (editPendingImages.left) leftUrl = await uploadProductImage(editPendingImages.left, 'left'); // upload helper[cite: 30]
      if (editPendingImages.right) rightUrl = await uploadProductImage(editPendingImages.right, 'right'); // upload helper[cite: 30]

      // 2. Prepare payload
      const updates = {
        title: document.getElementById('editTitle').value.trim(),
        category: document.getElementById('editCategory').value,
        price: parseFloat(document.getElementById('editPrice').value),
        is_negotiable: document.getElementById('editNegotiable').checked,
        location: document.getElementById('editLocation').value.trim(),
        description: document.getElementById('editDescription').value.trim(),
        image_front_url: frontUrl,
        image_back_url: backUrl,
        image_left_url: leftUrl,
        image_right_url: rightUrl
      };

      // 3. Update Database row in Supabase[cite: 27]
      const { error: updateErr } = await window.supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('seller_id', currentUserId);

      if (updateErr) throw updateErr;

      closeEditModal();
      showToast('Listing & photos updated successfully!', 'check_circle');
      await initInventory(currentUserId);
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to save changes: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-base">save</span><span>Save Changes</span>';
    }
  });
}

function showToast(message, icon = 'check_circle') {
  const toast = document.getElementById('toastNotification');
  const toastText = document.getElementById('toastText');
  const toastIcon = document.getElementById('toastIcon');

  toastText.textContent = message;
  toastIcon.textContent = icon;

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 2500);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}