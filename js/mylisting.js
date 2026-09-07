document.addEventListener('DOMContentLoaded', async () => {
  const checkSession = setInterval(async () => {
    if (window.currentUser) {
      clearInterval(checkSession);
      initMyListings(window.currentUser.id);
    }
  }, 50);
});

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
    container.innerHTML = '<p class="empty-state">Unable to load your listings right now.</p>';
    return;
  }

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 0;">
        <p style="font-size: 1.1rem; color: #64748b;">You have not published any items yet.</p>
        <a href="upload.html" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Upload your first listing</a>
      </div>
    `;
    return;
  }

  // Render cards with unified UI and management toolbar
  container.innerHTML = products.map(p => {
    const isSold = p.status === 'sold';
    return `
      <div class="card product-card ${isSold ? 'item-sold' : ''}" id="listing-${p.id}">
        <div class="card-img-container" style="position: relative;">
          <img 
            src="${p.image_front_url || 'https://via.placeholder.com/300x200?text=No+Photo'}" 
            alt="${escapeHtml(p.title)}" 
            class="card-img"
            loading="lazy"
          />
          <span class="card-badge">${escapeHtml(p.category || 'General')}</span>
          ${isSold ? '<span class="sold-badge-overlay">SOLD</span>' : ''}
        </div>

        <div class="card-body">
          <h4 class="card-title">${escapeHtml(p.title)}</h4>
          <p class="card-location">📍 ${escapeHtml(p.location || 'Campus')}</p>

          <div class="card-footer" style="margin-top: 8px;">
            <span class="card-price">฿${Number(p.price).toLocaleString()}</span>
            ${p.is_negotiable ? '<span class="card-negotiable">Negotiable</span>' : ''}
          </div>

          <!-- Management Actions -->
          <div class="listing-manage-actions">
            <button 
              class="btn-manage btn-toggle-sold ${isSold ? 'active' : ''}" 
              data-id="${p.id}" 
              data-status="${p.status || 'available'}"
            >
              ${isSold ? '🔄 Relist' : '✅ Mark Sold'}
            </button>
            <button 
              class="btn-manage btn-edit-listing" 
              data-id="${p.id}"
              data-title="${escapeHtml(p.title)}"
              data-price="${p.price}"
              data-location="${escapeHtml(p.location || '')}"
            >
              ✏️ Edit
            </button>
            <button class="btn-manage btn-delete-listing" data-id="${p.id}">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
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

  // 2. Edit Listing Modal Handlers
  const modal = document.getElementById('editListingModal');
  const form = document.getElementById('editListingForm');
  const cancelBtn = document.getElementById('btnCancelEdit');

  if (modal && form) {
    container.querySelectorAll('.btn-edit-listing').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('editProductId').value = btn.getAttribute('data-id');
        document.getElementById('editTitle').value = btn.getAttribute('data-title');
        document.getElementById('editPrice').value = btn.getAttribute('data-price');
        document.getElementById('editLocation').value = btn.getAttribute('data-location');
        modal.classList.remove('hidden');
      });
    });

    if (cancelBtn) {
      cancelBtn.onclick = () => modal.classList.add('hidden');
    }

    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('editProductId').value;
      const updates = {
        title: document.getElementById('editTitle').value.trim(),
        price: parseFloat(document.getElementById('editPrice').value),
        location: document.getElementById('editLocation').value.trim()
      };

      const { error } = await window.supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('seller_id', userId);

      if (error) {
        alert('Failed to update listing: ' + error.message);
        return;
      }

      modal.classList.add('hidden');
      await initMyListings(userId);
    };
  }

  // 3. Permanently Delete Product with Storage Cleanup
  container.querySelectorAll('.btn-delete-listing').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-id');

      if (!confirm('Are you sure you want to permanently delete this listing and its uploaded photos?')) return;

      btn.disabled = true;
      btn.textContent = '⏳ Deleting...';

      try {
        // Step A: Retrieve image URLs from the product record
        const { data: product, error: fetchErr } = await window.supabase
          .from('products')
          .select('image_front_url, image_back_url, image_left_url, image_right_url')
          .eq('id', productId)
          .single();

        if (fetchErr) {
          console.warn('Could not fetch product images for deletion:', fetchErr);
        }

        // Step B: Extract storage file paths from URLs
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

          // Step C: Delete image assets from Supabase Storage
          if (filesToDelete.length > 0) {
            const { error: storageErr } = await window.supabase
              .storage
              .from(bucketName)
              .remove(filesToDelete);

            if (storageErr) {
              console.warn('Storage cleanup warning:', storageErr);
            }
          }
        }

        // Step D: Delete any favorites linked to this product
        await window.supabase
          .from('favorites')
          .delete()
          .eq('product_id', productId);

        // Step E: Delete the product row from the database
        const { error: deleteErr } = await window.supabase
          .from('products')
          .delete()
          .eq('id', productId)
          .eq('seller_id', userId);

        if (deleteErr) {
          throw deleteErr;
        }

        // Refresh listings UI
        await initMyListings(userId);

      } catch (err) {
        console.error('Delete failed:', err);
        alert('Could not delete product: ' + err.message);
        btn.disabled = false;
        btn.textContent = '🗑️ Delete';
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