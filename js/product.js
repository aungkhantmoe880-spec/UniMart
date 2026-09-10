let currentProduct = null;
let currentSeller = null;
let currentStudentUser = null;
let isProductFavorited = false;
let activeGalleryImages = [];

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    alert('No product specified.');
    window.location.href = 'marketplace.html';
    return;
  }

  // Load Auth State
  const { data: { user } } = await window.supabase.auth.getUser();
  currentStudentUser = user;

  // Fetch product data and load view
  await loadProductView(productId);

  // Setup Interaction Hooks
  setupFavoriteHooks();
  setupContactHooks();
  setupModalDismissals();
});

// Load full product and seller data concurrently
async function loadProductView(productId) {
  try {
    const { data: product, error: prodErr } = await window.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (prodErr || !product) {
      alert('Product could not be found.');
      window.location.href = 'marketplace.html';
      return;
    }

    currentProduct = product;

    // Fetch seller profile details
    if (product.seller_id) {
      const { data: profile } = await window.supabase
        .from('profiles')
        .select('id, full_name, university, faculty, avatar_url')
        .eq('id', product.seller_id)
        .single();
      currentSeller = profile;
    }

    // Check if current user favorited this product
    if (currentStudentUser) {
      const { data: fav } = await window.supabase
        .from('favorites')
        .select('id')
        .eq('user_id', currentStudentUser.id)
        .eq('product_id', product.id)
        .maybeSingle();

      isProductFavorited = Boolean(fav);
    }

    renderProductData();
  } catch (err) {
    console.error('Error loading product details:', err);
  }
}

// Populate UI Elements with Dynamic Data
function renderProductData() {
  const p = currentProduct;

  // Breadcrumbs & Status
  document.getElementById('breadcrumbCategory').textContent = p.category || 'General';
  document.getElementById('breadcrumbTitle').textContent = p.title || 'Item Details';
  
  if (p.status === 'sold') {
    const badge = document.getElementById('badgeAvailability');
    badge.classList.remove('text-primary', 'bg-surface-container-low');
    badge.classList.add('text-tertiary', 'bg-tertiary-fixed/40');
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-tertiary"></span><span class="text-[11px] font-bold tracking-wider uppercase">Sold</span>`;
  }

  // Title, Category, Price
  document.getElementById('detailTitle').textContent = p.title || 'Untitled Product';
  document.getElementById('detailCategory').textContent = p.category || 'General';
  document.getElementById('detailPrice').textContent = `฿${Number(p.price || 0).toLocaleString()}`;

  if (p.is_negotiable) {
    document.getElementById('detailNegotiable').classList.remove('hidden');
  }

  // Condition resolution
  let conditionText = 'Used (Good)';
  if (p.condition) {
    const c = p.condition.toLowerCase();
    conditionText = c === 'new' ? 'Brand New' : c === 'like-new' ? 'Like New' : 'Used';
  }
  document.getElementById('detailCondition').textContent = conditionText;

  // Gender/Fit resolution
  let genderText = 'Unisex';
  if (p.gender) {
    const g = p.gender.toLowerCase();
    genderText = g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Unisex';
  }
  document.getElementById('detailGender').textContent = genderText;

  // Size, Location, Payment, Description
  document.getElementById('detailSize').textContent = p.size || 'Standard / Free';
  document.getElementById('detailLocation').textContent = p.location || 'On Campus';
  document.getElementById('detailPayment').textContent = (p.payment_method || 'PromptPay QR / Cash').toUpperCase();
  document.getElementById('detailDescription').textContent = p.description || 'No detailed description provided by the student seller.';

  // Seller Details
  if (currentSeller) {
    document.getElementById('sellerName').textContent = currentSeller.full_name || 'UniMart Student';
    document.getElementById('sellerAcademic').textContent = `${currentSeller.university || 'Campus'} • ${currentSeller.faculty || 'Student'}`;
    if (currentSeller.avatar_url) {
      document.getElementById('sellerAvatar').src = currentSeller.avatar_url;
      document.getElementById('modalSellerAvatar').src = currentSeller.avatar_url;
    }
  }

  // Gallery Setup
  setupImageGallery(p);

  // Sync Favorite Buttons
  updateFavoriteUI();

  // Contact Method Button Routing
  configureContactButtons(p);
}

// Multi-Angle Image Gallery Setup
function setupImageGallery(product) {
  const images = [
    { label: 'Front', url: product.image_front_url },
    { label: 'Back', url: product.image_back_url },
    { label: 'Left', url: product.image_left_url },
    { label: 'Right', url: product.image_right_url }
  ].filter(item => Boolean(item.url && item.url.trim() !== ''));

  activeGalleryImages = images.length > 0 ? images.map(i => i.url) : ['https://via.placeholder.com/600x450?text=No+Photo'];

  const mainImg = document.getElementById('mainDisplayImg');
  const counter = document.getElementById('galleryCounter');
  const thumbsContainer = document.getElementById('galleryThumbnails');

  mainImg.src = activeGalleryImages[0];
  counter.textContent = `1 / ${activeGalleryImages.length}`;

  thumbsContainer.innerHTML = activeGalleryImages.map((url, idx) => `
    <button 
      type="button" 
      class="thumb-btn w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-container-low border border-surface-container transition-all ${idx === 0 ? 'active' : 'opacity-70 hover:opacity-100'}"
      data-index="${idx}"
      data-url="${url}"
    >
      <img src="${url}" alt="Thumbnail" class="w-full h-full object-cover" />
    </button>
  `).join('');

  thumbsContainer.querySelectorAll('.thumb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const url = btn.getAttribute('data-url');

      mainImg.src = url;
      counter.textContent = `${idx + 1} / ${activeGalleryImages.length}`;

      thumbsContainer.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// Configure Contact Buttons based on seller preference
function configureContactButtons(product) {
  const desktopBtn = document.getElementById('btnContactSeller');
  const mobileBtn = document.getElementById('btnMobileContact');
  const desktopLabel = document.getElementById('contactBtnLabel');
  const mobileLabel = document.getElementById('mobileContactLabel');

  if (product.contact_method === 'line' && product.contact_handle) {
    const lineUrl = `https://line.me/ti/p/~${product.contact_handle}`;
    desktopLabel.textContent = `Open LINE (@${product.contact_handle})`;
    mobileLabel.textContent = `Open LINE`;
    const openLine = () => window.open(lineUrl, '_blank');
    desktopBtn.onclick = openLine;
    mobileBtn.onclick = openLine;
  } else if (product.contact_method === 'telegram' && product.contact_handle) {
    const tgUrl = `https://t.me/${product.contact_handle.replace('@', '')}`;
    desktopLabel.textContent = `Telegram (${product.contact_handle})`;
    mobileLabel.textContent = `Telegram`;
    const openTg = () => window.open(tgUrl, '_blank');
    desktopBtn.onclick = openTg;
    mobileBtn.onclick = openTg;
  } else {
    // Default: Open in-app message modal
    desktopBtn.onclick = openContactModal;
    mobileBtn.onclick = openContactModal;
  }
}

// Setup Favorite Toggling Hooks
function setupFavoriteHooks() {
  const desktopBtn = document.getElementById('btnFavoriteDetail');
  const mobileBtn = document.getElementById('btnMobileFav');

  const handleFavoriteClick = async () => {
    if (!currentStudentUser) {
      alert('Please sign in to save items to your favorites.');
      window.location.href = 'login.html';
      return;
    }

    isProductFavorited = !isProductFavorited;
    updateFavoriteUI();

    try {
      if (isProductFavorited) {
        await window.supabase
          .from('favorites')
          .insert([{ user_id: currentStudentUser.id, product_id: currentProduct.id }]);
        showToast('Saved to your campus favorites!', 'favorite');
      } else {
        await window.supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentStudentUser.id)
          .eq('product_id', currentProduct.id);
        showToast('Removed from favorites.', 'heart_broken');
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // Rollback UI
      isProductFavorited = !isProductFavorited;
      updateFavoriteUI();
    }
  };

  if (desktopBtn) desktopBtn.addEventListener('click', handleFavoriteClick);
  if (mobileBtn) mobileBtn.addEventListener('click', handleFavoriteClick);
}

// Update Favorite Visual State across Desktop and Mobile
function updateFavoriteUI() {
  const favIcon = document.getElementById('favIcon');
  const favLabel = document.getElementById('favLabel');
  const mobileFavIcon = document.getElementById('mobileFavIcon');
  const mobileBtn = document.getElementById('btnMobileFav');

  if (isProductFavorited) {
    favIcon.classList.add('text-tertiary', 'fill-1');
    favLabel.textContent = 'Favorited';
    mobileFavIcon.classList.add('text-tertiary', 'fill-1');
    mobileBtn.classList.add('text-tertiary');
  } else {
    favIcon.classList.remove('text-tertiary', 'fill-1');
    favLabel.textContent = 'Add to Favorites';
    mobileFavIcon.classList.remove('text-tertiary', 'fill-1');
    mobileBtn.classList.remove('text-tertiary');
  }
}

// Modal open/close actions
function openContactModal() {
  if (!currentStudentUser) {
    alert('Please sign in to contact sellers.');
    window.location.href = 'login.html';
    return;
  }

  // Prevent messaging oneself
  if (currentProduct.seller_id === currentStudentUser.id) {
    alert('This is your own listing.');
    return;
  }

  const modal = document.getElementById('contactModal');
  const title = document.getElementById('modalProductTitle');
  const price = document.getElementById('modalProductPrice');
  const img = document.getElementById('modalProductImg');
  const messageInput = document.getElementById('contactMessage');
  const sellerTitle = document.getElementById('modalSellerTitle');

  title.textContent = currentProduct.title;
  price.textContent = `฿${Number(currentProduct.price || 0).toLocaleString()}`;
  img.src = currentProduct.image_front_url || 'https://via.placeholder.com/150?text=Item';
  sellerTitle.textContent = `Message ${currentSeller?.full_name || 'Seller'}`;

  messageInput.value = `Hi ${currentSeller?.full_name ? currentSeller.full_name.split(' ')[0] : 'there'}, I'm interested in your ${currentProduct.title}. Is it still available for meetup?`;

  modal.classList.add('active');
}

function closeContactModal() {
  document.getElementById('contactModal').classList.remove('active');
}

function setupModalDismissals() {
  document.getElementById('closeModalBtn')?.addEventListener('click', closeContactModal);
  document.getElementById('cancelModalBtn')?.addEventListener('click', closeContactModal);
  
  const modal = document.getElementById('contactModal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeContactModal();
  });

  // ESC Key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeContactModal();
    }
  });
}

// Handle In-App Conversation Submission
function setupContactHooks() {
  const sendBtn = document.getElementById('sendMessageBtn');

  sendBtn?.addEventListener('click', async () => {
    const text = document.getElementById('contactMessage').value.trim();
    if (!text) return;

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Sending...';

    try {
      // 1. Fetch or create conversation
      const { data: existingConvo } = await window.supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', currentStudentUser.id)
        .eq('seller_id', currentProduct.seller_id)
        .eq('product_id', currentProduct.id)
        .maybeSingle();

      let convoId = existingConvo?.id;

      if (!convoId) {
        const { data: newConvo, error: convoErr } = await window.supabase
          .from('conversations')
          .insert([{
            buyer_id: currentStudentUser.id,
            seller_id: currentProduct.seller_id,
            product_id: currentProduct.id,
            last_message: text,
            last_message_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (convoErr) throw convoErr;
        convoId = newConvo.id;
      }

      // 2. Insert Message Record
      const { error: msgErr } = await window.supabase
        .from('messages')
        .insert([{
          conversation_id: convoId,
          sender_id: currentStudentUser.id,
          content: text
        }]);

      if (msgErr) throw msgErr;

      // 3. Update Conversation Timestamp
      await window.supabase
        .from('conversations')
        .update({
          last_message: text,
          last_message_at: new Date().toISOString()
        })
        .eq('id', convoId);

      closeContactModal();
      showToast('Message sent! Redirecting to chat...', 'send');

      setTimeout(() => {
        window.location.href = `messages.html?seller=${currentProduct.seller_id}&product=${currentProduct.id}`;
      }, 1000);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Could not send message: ' + err.message);
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span class="material-symbols-outlined text-base">send</span><span>Send Message</span>';
    }
  });
}

// Toast notification helper
function showToast(message, iconName = 'check_circle') {
  const toast = document.getElementById('toastNotification');
  const toastText = document.getElementById('toastText');
  const toastIcon = document.getElementById('toastIcon');

  toastText.textContent = message;
  toastIcon.textContent = iconName;

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 2500);
}