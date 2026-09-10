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
  await loadUserFavorites(userId);

  setupEditModal(userId);
  setupAvatarUpload(userId);
  setupAvatarLightbox();
}

// 1. Fetch Student Profile Data
async function loadProfileData(userId) {
  try {
    const { data: profile, error } = await window.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) return console.error(error);

    document.getElementById('dispFullName').textContent = profile.full_name || 'UniMart Student';
    document.getElementById('dispStudentId').textContent = `ID: ${profile.student_id || 'N/A'}`;
    document.getElementById('dispAge').textContent = `${profile.age || '--'} yrs`;
    document.getElementById('dispEmail').textContent = profile.email || window.currentUser.email;
    document.getElementById('dispUni').textContent = profile.university || 'University';
    document.getElementById('dispFaculty').textContent = profile.faculty || 'Faculty / Major';
    document.getElementById('dispBio').textContent = profile.bio ? `“${profile.bio}”` : '“No bio provided yet.”';

    const avatarImg = document.getElementById('avatarImage');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const overlay = document.getElementById('avatarOverlay');
    const navAvatar = document.getElementById('navUserAvatar');

    if (profile.avatar_url && profile.avatar_url.trim() !== '') {
      avatarImg.src = profile.avatar_url;
      avatarImg.classList.remove('hidden');
      avatarPlaceholder.classList.add('hidden');
      overlay.classList.remove('hidden');
      if (navAvatar) navAvatar.src = profile.avatar_url;
    } else {
      avatarImg.src = '';
      avatarImg.classList.add('hidden');
      avatarPlaceholder.classList.remove('hidden');
      overlay.classList.add('hidden');
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

// 2. Avatar Actions: Upload, Change, Delete & View
function setupAvatarUpload(userId) {
  const avatarInput = document.getElementById('avatarInput');
  const avatarDisplayBox = document.getElementById('avatarDisplayBox');
  const avatarImg = document.getElementById('avatarImage');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const overlay = document.getElementById('avatarOverlay');
  const deleteBtn = document.getElementById('deleteAvatarBtn');
  const viewBtn = document.getElementById('viewAvatarBtn');
  const navAvatar = document.getElementById('navUserAvatar');

  if (!avatarDisplayBox || !avatarInput) return;

  // Trigger file input if clicking empty placeholder
  avatarPlaceholder.addEventListener('click', () => {
    avatarInput.click();
  });

  // Re-upload or Upload new avatar
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await window.supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

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
      if (navAvatar) navAvatar.src = publicUrl;
    } catch (err) {
      alert('Avatar upload failed: ' + err.message);
    } finally {
      avatarInput.value = '';
    }
  });

  // Delete profile picture
  deleteBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove your profile picture?')) return;

    try {
      // 1. Clear database reference
      await window.supabase
        .from('profiles')
        .update({ avatar_url: '' })
        .eq('id', userId);

      // 2. Reset UI
      avatarImg.src = '';
      avatarImg.classList.add('hidden');
      avatarPlaceholder.classList.remove('hidden');
      overlay.classList.add('hidden');
      if (navAvatar) {
        navAvatar.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23707881'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
      }
    } catch (err) {
      alert('Could not remove avatar: ' + err.message);
    }
  });

  // View full original photo
  viewBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const modal = document.getElementById('avatarLightboxModal');
    const lightboxImg = document.getElementById('avatarLightboxImg');
    if (avatarImg.src && !avatarImg.classList.contains('hidden')) {
      lightboxImg.src = avatarImg.src;
      modal.classList.remove('opacity-0', 'pointer-events-none');
    }
  });
}

// 3. Fullscreen Lightbox Handlers
function setupAvatarLightbox() {
  const modal = document.getElementById('avatarLightboxModal');
  const closeBtn = document.getElementById('closeAvatarLightboxBtn');

  const close = () => {
    modal.classList.add('opacity-0', 'pointer-events-none');
  };

  closeBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('pointer-events-none')) {
      close();
    }
  });
}

// 4. Edit Profile Modal
function setupEditModal(userId) {
  const modal = document.getElementById('editModal');
  const openBtn = document.getElementById('openEditBtn');
  const closeBtn = document.getElementById('closeEditBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const form = document.getElementById('editProfileForm');

  const openModal = () => modal.classList.add('active');
  const closeModal = () => modal.classList.remove('active');

  openBtn?.addEventListener('click', () => {
    document.getElementById('editFullName').value = document.getElementById('dispFullName').textContent.trim();
    document.getElementById('editAge').value = parseInt(document.getElementById('dispAge').textContent, 10) || 18;
    document.getElementById('editUniversity').value = document.getElementById('dispUni').textContent.trim();
    document.getElementById('editFaculty').value = document.getElementById('dispFaculty').textContent.trim();
    
    const bioText = document.getElementById('dispBio').textContent.replace(/[“”]/g, '').trim();
    document.getElementById('editBio').value = bioText === 'No bio provided yet.' ? '' : bioText;

    openModal();
  });

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  form?.addEventListener('submit', async (e) => {
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

    closeModal();
    await loadProfileData(userId);
  });
}

// 5. Fetch & Render Favorites
async function loadUserFavorites(userId) {
  const container = document.getElementById('favoritesGrid');
  const countBadge = document.getElementById('favsCountBadge');

  try {
    const { data: favs, error } = await window.supabase
      .from('favorites')
      .select('product_id, products(*)')
      .eq('user_id', userId);

    if (error) throw error;

    const validProducts = (favs || []).map(f => f.products).filter(Boolean);
    if (countBadge) countBadge.textContent = `(${validProducts.length} items)`;

    if (validProducts.length === 0) {
      container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20 text-center gap-3">
          <span class="material-symbols-outlined text-5xl text-outline">favorite_border</span>
          <h3 class="text-base font-bold text-on-surface">No favorites saved yet</h3>
          <p class="text-xs text-on-surface-variant max-w-sm">Tap the heart icon on any marketplace item to bookmark it here for quick access.</p>
          <a href="marketplace.html" class="mt-2 h-10 px-5 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <span class="material-symbols-outlined text-base">storefront</span>
            <span>Browse Marketplace</span>
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = validProducts.map(p => {
      const isSold = p.status === 'sold';
      const condition = (p.condition || 'Good').toUpperCase();

      return `
        <article 
          class="group relative flex flex-col bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md border border-surface-container overflow-hidden transition-all cursor-pointer ${isSold ? 'opacity-80' : ''}" 
          data-id="${p.id}"
        >
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

            <button 
              type="button" 
              class="btn-remove-fav absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center text-tertiary shadow-sm hover:scale-110 transition-transform" 
              data-id="${p.id}"
              title="Remove from favorites"
            >
              <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">favorite</span>
            </button>

            ${isSold ? `
              <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                <span class="px-3 py-1 bg-error-container text-on-error-container text-xs font-bold rounded-lg uppercase tracking-wider">SOLD</span>
              </div>
            ` : ''}
          </div>

          <div class="p-3 flex flex-col flex-grow justify-between gap-2">
            <div>
              <span class="text-base font-bold text-on-surface block leading-tight">
                ฿${Number(p.price || 0).toLocaleString()}
              </span>
              <h3 class="text-xs sm:text-sm text-on-surface line-clamp-1 font-semibold group-hover:text-primary transition-colors mt-0.5">
                ${escapeHtml(p.title)}
              </h3>
            </div>

            <div class="flex items-center justify-between text-on-surface-variant text-[11px] pt-1 border-t border-surface-container/60">
              <span class="truncate">📍 ${escapeHtml(p.location || 'Campus')}</span>
              <span class="text-primary font-medium flex items-center gap-0.5">
                <span>View</span>
                <span class="material-symbols-outlined text-xs">arrow_forward</span>
              </span>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach card click handlers for detail routing
    container.querySelectorAll('article').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-fav')) return;
        const productId = card.getAttribute('data-id');
        window.location.href = `product.html?id=${productId}`;
      });
    });

    // Attach remove favorite listener
    container.querySelectorAll('.btn-remove-fav').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const prodId = btn.getAttribute('data-id');

        await window.supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', prodId);

        await loadUserFavorites(userId);
      });
    });

  } catch (err) {
    console.error('Error loading favorites:', err);
    container.innerHTML = '<p class="col-span-full text-center py-20 text-sm text-tertiary">Could not load favorites right now.</p>';
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}