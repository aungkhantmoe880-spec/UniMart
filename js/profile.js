document.addEventListener('DOMContentLoaded', async () => {
  const checkSession = setInterval(async () => {
    if (window.currentUser) {
      clearInterval(checkSession);
      initProfilePage();
    }
  }, 50);
});

async function initProfilePage() {
  const userId = window.currentUser.id;

  await loadProfileData(userId);
  await loadUserListings(userId);
  await loadUserFavorites(userId);

  setupTabSwitching();
  setupEditModal(userId);
  setupAvatarUpload(userId);
}

// 1. Fetch Profile Data & Toggle Avatar/Overlay
async function loadProfileData(userId) {
  const { data: profile, error } = await window.supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) return console.error(error);

  document.getElementById('dispFullName').textContent = profile.full_name || 'N/A';
  document.getElementById('dispStudentId').textContent = `ID: ${profile.student_id || 'N/A'}`;
  document.getElementById('dispAge').textContent = profile.age || '--';
  document.getElementById('dispEmail').textContent = profile.email || window.currentUser.email;
  document.getElementById('dispUni').textContent = profile.university || 'University';
  document.getElementById('dispFaculty').textContent = profile.faculty || 'Faculty / Major';
  document.getElementById('dispBio').textContent = profile.bio || 'No bio provided yet.';

  const avatarImg = document.getElementById('avatarImage');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const overlay = document.getElementById('avatarOverlay');

  if (profile.avatar_url && profile.avatar_url.trim() !== '') {
    avatarImg.src = profile.avatar_url;
    avatarImg.classList.remove('hidden');
    avatarPlaceholder.classList.add('hidden');
    overlay.classList.remove('hidden');
  } else {
    avatarImg.src = '';
    avatarImg.classList.add('hidden');
    avatarPlaceholder.classList.remove('hidden');
    overlay.classList.add('hidden');
  }
}

// 2. Avatar Actions: Upload, Delete, & Full View Lightbox
function setupAvatarUpload(userId) {
  const avatarInput = document.getElementById('avatarInput');
  const avatarDisplayBox = document.getElementById('avatarDisplayBox');
  const avatarImg = document.getElementById('avatarImage');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const overlay = document.getElementById('avatarOverlay');
  const deleteBtn = document.getElementById('deleteAvatarBtn');
  const viewBtn = document.getElementById('viewAvatarBtn');

  const lightboxModal = document.getElementById('imageLightboxModal');
  const lightboxFullImage = document.getElementById('lightboxFullImage');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');

  avatarDisplayBox.addEventListener('click', () => {
    if (avatarImg.classList.contains('hidden')) {
      avatarInput.click();
    }
  });

  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await window.supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert('Avatar upload failed: ' + uploadError.message);
      return;
    }

    const { data: { publicUrl } } = window.supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await window.supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    avatarImg.src = publicUrl;
    avatarImg.classList.remove('hidden');
    avatarPlaceholder.classList.add('hidden');
    overlay.classList.remove('hidden');
    avatarInput.value = '';
  });

  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete your profile photo?')) return;

    await window.supabase
      .from('profiles')
      .update({ avatar_url: '' })
      .eq('id', userId);

    avatarImg.src = '';
    avatarImg.classList.add('hidden');
    avatarPlaceholder.classList.remove('hidden');
    overlay.classList.add('hidden');
  });

  const openPreview = (e) => {
    e.stopPropagation();
    if (avatarImg.src && !avatarImg.classList.contains('hidden')) {
      lightboxFullImage.src = avatarImg.src;
      lightboxModal.classList.remove('hidden');
    }
  };

  viewBtn.addEventListener('click', openPreview);
  avatarImg.addEventListener('click', openPreview);

  closeLightboxBtn.addEventListener('click', () => lightboxModal.classList.add('hidden'));
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) lightboxModal.classList.add('hidden');
  });
}

// 3. Edit Profile Modal
function setupEditModal(userId) {
  const modal = document.getElementById('editModal');
  const openBtn = document.getElementById('openEditBtn');
  const closeBtn = document.getElementById('closeEditBtn');
  const form = document.getElementById('editProfileForm');

  openBtn.addEventListener('click', () => {
    document.getElementById('editFullName').value = document.getElementById('dispFullName').textContent;
    document.getElementById('editAge').value = parseInt(document.getElementById('dispAge').textContent, 10) || 18;
    document.getElementById('editUniversity').value = document.getElementById('dispUni').textContent;
    document.getElementById('editFaculty').value = document.getElementById('dispFaculty').textContent;
    document.getElementById('editBio').value = document.getElementById('dispBio').textContent;
    modal.classList.remove('hidden');
  });

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const updates = {
      full_name: document.getElementById('editFullName').value.trim(),
      age: parseInt(document.getElementById('editAge').value, 10),
      university: document.getElementById('editUniversity').value.trim(),
      faculty: document.getElementById('editFaculty').value.trim(),
      bio: document.getElementById('editBio').value.trim(),
    };

    const { error } = await window.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      alert('Failed to update: ' + error.message);
      return;
    }

    modal.classList.add('hidden');
    loadProfileData(userId);
  });
}

// 4. Tab Switching
function setupTabSwitching() {
  const tabListings = document.getElementById('tabMyListingsBtn');
  const tabFavs = document.getElementById('tabFavoritesBtn');
  const gridListings = document.getElementById('listingsGrid');
  const gridFavs = document.getElementById('favoritesGrid');

  tabListings.addEventListener('click', () => {
    tabListings.classList.add('active');
    tabFavs.classList.remove('active');
    gridListings.classList.remove('hidden');
    gridFavs.classList.add('hidden');
  });

  tabFavs.addEventListener('click', () => {
    tabFavs.classList.add('active');
    tabListings.classList.remove('active');
    gridFavs.classList.remove('hidden');
    gridListings.classList.add('hidden');
  });
}

// 5. Load Listings (Using matching card layout)
async function loadUserListings(userId) {
  const { data: products, error } = await window.supabase
    .from('products')
    .select('*')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });

  const container = document.getElementById('listingsGrid');
  const countEl = document.getElementById('listingsCount');
  if (countEl) countEl.textContent = products?.length || 0;

  if (error || !products || products.length === 0) {
    container.innerHTML = '<p class="empty-state">You have not listed any products yet.</p>';
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="card-image-wrap">
        <img 
          src="${p.image_front_url || 'https://via.placeholder.com/300x200?text=No+Photo'}" 
          alt="${escapeHtml(p.title)}"
          loading="lazy"
        />
        <span class="card-badge">${escapeHtml(p.category || 'General')}</span>
      </div>
      <div class="card-content">
        <h4 class="card-title">${escapeHtml(p.title)}</h4>
        <div class="card-price-row">
          <span class="card-price">฿${Number(p.price).toLocaleString()}</span>
          ${p.is_negotiable ? '<span class="card-negotiable">Negotiable</span>' : ''}
        </div>
        <div class="card-meta">
          <span>✨ ${escapeHtml(p.condition || 'Used')}</span>
          <span>•</span>
          <span>📍 ${escapeHtml(p.location || 'Campus')}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// 6. Load Favorites (Formatted identically to listings with quick remove)
async function loadUserFavorites(userId) {
  const container = document.getElementById('favoritesGrid');
  const countEl = document.getElementById('favsCount');

  const { data: favs, error } = await window.supabase
    .from('favorites')
    .select('product_id, products(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorites:', error);
    container.innerHTML = '<p class="empty-state">Unable to load favorites right now.</p>';
    return;
  }

  const validProducts = (favs || []).map(f => f.products).filter(Boolean);
  if (countEl) countEl.textContent = validProducts.length;

  if (validProducts.length === 0) {
    container.innerHTML = '<p class="empty-state">No favorite items saved yet.</p>';
    return;
  }

  container.innerHTML = validProducts.map(p => `
    <div class="product-card">
      <div class="card-image-wrap">
        <img 
          src="${p.image_front_url || 'https://via.placeholder.com/300x200?text=No+Photo'}" 
          alt="${escapeHtml(p.title)}"
          loading="lazy"
        />
        <span class="card-badge">${escapeHtml(p.category || 'General')}</span>
      </div>
      <div class="card-content">
        <h4 class="card-title">${escapeHtml(p.title)}</h4>
        <div class="card-price-row">
          <span class="card-price">฿${Number(p.price).toLocaleString()}</span>
          ${p.is_negotiable ? '<span class="card-negotiable">Negotiable</span>' : ''}
        </div>
        <div class="card-meta">
          <span>✨ ${escapeHtml(p.condition || 'Used')}</span>
          <span>•</span>
          <span>📍 ${escapeHtml(p.location || 'Campus')}</span>
        </div>
        <div class="card-actions" style="margin-top: 8px; display: flex; justify-content: flex-end;">
          <button class="btn-icon remove-fav-btn" data-id="${p.id}" title="Remove from Favorites">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  // Remove handler inside profile favorites tab
  container.querySelectorAll('.remove-fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const prodId = btn.getAttribute('data-id');
      await window.supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', prodId);
      
      // Reload tab to reflect removal
      loadUserFavorites(userId);
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