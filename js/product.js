document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    alert('No product ID specified.');
    window.location.href = 'marketplace.html';
    return;
  }

  await loadProductDetails(productId);
});

async function loadProductDetails(productId) {
  // 1. Fetch product record directly
  const { data: product, error: prodError } = await window.supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (prodError || !product) {
    console.error('Failed to load product:', prodError);
    alert('Product not found: ' + (prodError?.message || 'Item does not exist'));
    window.location.href = 'marketplace.html';
    return;
  }

  // 2. Fetch seller profile separately to avoid Foreign Key join issues
  let seller = null;
  if (product.seller_id) {
    const { data: profileData } = await window.supabase
      .from('profiles')
      .select('full_name, university, faculty, avatar_url')
      .eq('id', product.seller_id)
      .single();
    seller = profileData;
  }

  // 3. Populate Product Details with explicit descriptive labels
  document.getElementById('detailTitle').textContent = product.title || 'Untitled Product';
  document.getElementById('detailCategory').textContent = product.category || 'General';
  document.getElementById('detailPrice').textContent = `฿${Number(product.price || 0).toLocaleString()}`;
  
  // Format values
  const conditionValue = (product.condition || 'Used').toUpperCase() === 'NEW' ? 'New' : (product.condition || 'Used');
  
  // Gender value resolution with fallback
  let genderValue = 'Unisex';
  if (product.gender && String(product.gender).trim() !== '') {
    const gLower = String(product.gender).toLowerCase().trim();
    genderValue = gLower === 'male' ? 'Male' : gLower === 'female' ? 'Female' : 'Unisex';
  }

  // Size value resolution with fallback
  const sizeValue = (product.size && String(product.size).trim() !== '')
    ? String(product.size).toUpperCase().trim()
    : 'Free Size / Standard';

  const locationValue = product.location || 'Campus';
  const paymentValue = (product.payment_method || 'QR / Cash').toUpperCase();

  // Populate Badges safely
  const conditionElem = document.getElementById('detailCondition');
  const genderElem = document.getElementById('detailGender');
  const sizeElem = document.getElementById('detailSize');
  const locationElem = document.getElementById('detailLocation');
  const paymentElem = document.getElementById('detailPayment');
  const descElem = document.getElementById('detailDescription');

  if (conditionElem) conditionElem.textContent = `✨ Condition - ${conditionValue}`;
  if (genderElem) genderElem.textContent = `🚻 Gender - ${genderValue}`;
  if (sizeElem) sizeElem.textContent = `📏 Size - ${sizeValue}`;
  if (locationElem) locationElem.textContent = `📍 Exchange location - ${locationValue}`;
  if (paymentElem) paymentElem.textContent = `💳 Payment method - ${paymentValue}`;
  if (descElem) descElem.textContent = product.description || 'No description provided by the seller.';

  if (product.is_negotiable) {
    document.getElementById('detailNegotiable')?.classList.remove('hidden');
  }

  // 4. Populate Seller Profile Info
  if (seller) {
    document.getElementById('sellerName').textContent = seller.full_name || 'Student Seller';
    document.getElementById('sellerAcademic').textContent = `${seller.university || 'Campus'} • ${seller.faculty || 'Student'}`;
    if (seller.avatar_url && seller.avatar_url.trim() !== '') {
      document.getElementById('sellerAvatar').src = seller.avatar_url;
    }
  } else {
    document.getElementById('sellerName').textContent = 'UniMart Student';
    document.getElementById('sellerAcademic').textContent = 'Campus Seller';
  }

  // 5. Setup Multi-Angle Image Gallery & Full-size Lightbox
  setupImageGallery(product);

  // 6. Connect Action Buttons (Favorites & Contact)
  setupDetailActions(product);
}

function setupImageGallery(product) {
  const mainImgFrame = document.getElementById('mainImageFrame');
  const mainImg = document.getElementById('mainDisplayImg');
  const thumbnailList = document.getElementById('thumbnailList');

  const lightboxModal = document.getElementById('imageLightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  // Collect all uploaded photo URLs
  const images = [
    { label: 'Front', url: product.image_front_url },
    { label: 'Back', url: product.image_back_url },
    { label: 'Left', url: product.image_left_url },
    { label: 'Right', url: product.image_right_url }
  ].filter(img => img.url && img.url.trim() !== '');

  if (images.length === 0) {
    mainImg.src = 'https://via.placeholder.com/600x450?text=No+Photo';
    return;
  }

  // Set default main photo
  mainImg.src = images[0].url;

  // Build thumbnail slots
  thumbnailList.innerHTML = images.map((img, index) => `
    <div class="thumbnail-slot ${index === 0 ? 'active' : ''}" data-url="${img.url}">
      <img src="${img.url}" alt="${img.label} View" />
    </div>
  `).join('');

  // Switch displayed photo when clicking thumbnails
  const thumbs = thumbnailList.querySelectorAll('.thumbnail-slot');
  thumbs.forEach(slot => {
    slot.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      slot.classList.add('active');
      mainImg.src = slot.getAttribute('data-url');
    });
  });

  // Lightbox opening handler
  if (mainImgFrame && lightboxModal && lightboxImg) {
    mainImgFrame.addEventListener('click', () => {
      lightboxImg.src = mainImg.src;
      lightboxModal.classList.remove('hidden');
    });

    // Close on background click
    lightboxModal.addEventListener('click', (e) => {
      if (e.target !== lightboxImg) {
        lightboxModal.classList.add('hidden');
      }
    });

    // Close on 'X' button click
    if (lightboxClose) {
      lightboxClose.addEventListener('click', () => {
        lightboxModal.classList.add('hidden');
      });
    }

    // Close on 'Escape' key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lightboxModal.classList.contains('hidden')) {
        lightboxModal.classList.add('hidden');
      }
    });
  }
}

async function setupDetailActions(product) {
  const favBtn = document.getElementById('btnFavoriteDetail');
  const contactBtn = document.getElementById('btnContactSeller');

  const { data: { user } } = await window.supabase.auth.getUser();

  // Contact Method Routing
  if (product.contact_method === 'line' && product.contact_handle) {
    contactBtn.href = `https://line.me/ti/p/~${product.contact_handle}`;
    contactBtn.textContent = `💬 Open LINE (@${product.contact_handle})`;
    contactBtn.target = '_blank';
  } else if (product.contact_method === 'telegram' && product.contact_handle) {
    contactBtn.href = `https://t.me/${product.contact_handle.replace('@', '')}`;
    contactBtn.textContent = `✈️ Open Telegram (${product.contact_handle})`;
    contactBtn.target = '_blank';
  } else {
    contactBtn.href = `messages.html?seller=${product.seller_id}&product=${product.id}`;
  }

  if (!user) return;

  // Check if current student previously favorited this item
  const { data: existingFav } = await window.supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', product.id)
    .maybeSingle();

  if (existingFav) {
    favBtn.classList.add('active');
    favBtn.textContent = '💖 Favorited';
  }

  // Toggle favorite on click
  favBtn.addEventListener('click', async () => {
    const isFav = favBtn.classList.contains('active');

    try {
      if (!isFav) {
        await window.supabase
          .from('favorites')
          .insert([{ user_id: user.id, product_id: product.id }]);
        favBtn.classList.add('active');
        favBtn.textContent = '💖 Favorited';
      } else {
        await window.supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
        favBtn.classList.remove('active');
        favBtn.textContent = '❤️ Add to Favorites';
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  });
}