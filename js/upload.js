// Manage image preview, delete, and view modal for a slot
function handleImageSlot(slotId, inputId, previewId, labelId, actionsId) {
  const slot = document.getElementById(slotId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const label = document.getElementById(labelId);
  const actions = document.getElementById(actionsId);

  if (!slot || !input || !preview || !label || !actions) return;

  const btnView = actions.querySelector('.btn-slot-view');
  const btnDelete = actions.querySelector('.btn-slot-delete');

  // 1. File Selection
  input.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.classList.remove('hide');
        label.classList.add('hide');
        actions.classList.remove('hide');
        slot.classList.add('has-image');
      };
      reader.readAsDataURL(file);
    }
  });

  // 2. View Original Large Image
  btnView?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (preview.src) {
      const lightboxModal = document.getElementById('imageLightboxModal');
      const lightboxImg = document.getElementById('uploadLightboxImg');
      lightboxImg.src = preview.src;
      lightboxModal.classList.remove('hide');
    }
  });

  // 3. Delete / Clear Image Slot
  btnDelete?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.value = '';
    preview.src = '';
    preview.classList.add('hide');
    actions.classList.add('hide');
    label.classList.remove('hide');
    slot.classList.remove('has-image');
  });
}

// Lightbox listener to close on click or Escape
function setupUploadLightbox() {
  const modal = document.getElementById('imageLightboxModal');
  const closeBtn = document.getElementById('uploadLightboxClose');

  if (!modal) return;

  modal.addEventListener('click', (e) => {
    if (e.target !== document.getElementById('uploadLightboxImg')) {
      modal.classList.add('hide');
    }
  });

  closeBtn?.addEventListener('click', () => {
    modal.classList.add('hide');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.add('hide');
  });
}

// Initialize all slots and form elements on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  handleImageSlot('slot-front', 'imgFront', 'preview-front', 'label-front', 'actions-front');
  handleImageSlot('slot-back', 'imgBack', 'preview-back', 'label-back', 'actions-back');
  handleImageSlot('slot-left', 'imgLeftSide', 'preview-left', 'label-left', 'actions-left');
  handleImageSlot('slot-right', 'imgRightSide', 'preview-right', 'label-right', 'actions-right');

  setupUploadLightbox();
  setupCategoryToggle();
  setupConditionToggle();
  setupPaymentToggle();
  setupContactToggle();
  setupFormSubmission();
});

// Category "Other" toggle
function setupCategoryToggle() {
  const categorySelect = document.getElementById('productCategory');
  const customCategoryInput = document.getElementById('customCategoryInput');

  if (!categorySelect || !customCategoryInput) return;

  categorySelect.addEventListener('change', function () {
    if (this.value === 'other') {
      customCategoryInput.classList.remove('custom-field-hidden');
      customCategoryInput.focus();
    } else {
      customCategoryInput.classList.add('custom-field-hidden');
      customCategoryInput.value = '';
    }
  });
}

// Condition "Other" toggle
function setupConditionToggle() {
  const conditionRadios = document.querySelectorAll('input[name="productCondition"]');
  const customConditionInput = document.getElementById('customConditionInput');

  if (!conditionRadios.length || !customConditionInput) return;

  conditionRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (this.value === 'other') {
        customConditionInput.classList.remove('custom-field-hidden');
        customConditionInput.focus();
      } else {
        customConditionInput.classList.add('custom-field-hidden');
        customConditionInput.value = '';
      }
    });
  });
}

// Payment "Other" toggle
function setupPaymentToggle() {
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
  const customPaymentInput = document.getElementById('customPaymentInput');

  if (!paymentRadios.length || !customPaymentInput) return;

  paymentRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (this.value === 'other') {
        customPaymentInput.classList.remove('custom-field-hidden');
        customPaymentInput.focus();
      } else {
        customPaymentInput.classList.add('custom-field-hidden');
        customPaymentInput.value = '';
      }
    });
  });
}

// Contact handle toggle
function setupContactToggle() {
  const contactRadios = document.querySelectorAll('input[name="contactMethod"]');
  const contactHandleInput = document.getElementById('contactHandleInput');

  if (!contactRadios.length || !contactHandleInput) return;

  contactRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (this.value === 'line' || this.value === 'telegram') {
        contactHandleInput.classList.remove('custom-field-hidden');
        contactHandleInput.placeholder = this.value === 'line' 
          ? 'Enter your LINE ID' 
          : 'Enter your Telegram @username';
        contactHandleInput.focus();
      } else {
        contactHandleInput.classList.add('custom-field-hidden');
        contactHandleInput.value = '';
      }
    });
  });
}

// Data extraction and submission
function setupFormSubmission() {
  const form = document.getElementById('uploadForm');
  const modal = document.getElementById('previewModal');
  const btnEdit = document.getElementById('btnEditListing');
  const btnConfirm = document.getElementById('btnConfirmPublish');

  if (!form || !modal) return;

  let pendingProductData = null;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const title = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const isNegotiable = document.getElementById('isNegotiable')?.checked || false;
    const location = document.getElementById('productLocation').value.trim();
    const description = document.getElementById('productDescription')?.value.trim() || '';

    // Category
    let category = document.getElementById('productCategory').value;
    let categoryLabel = category;
    if (category === 'other') {
      category = document.getElementById('customCategoryInput').value.trim() || 'Other';
      categoryLabel = category;
    } else {
      const selectElem = document.getElementById('productCategory');
      categoryLabel = selectElem.options[selectElem.selectedIndex].text;
    }

    // Gender selection (null if unselected)
    const selectedGender = document.querySelector('input[name="productGender"]:checked')?.value || null;

    // Size selection (null if unselected)
    const selectedSize = document.querySelector('input[name="productSize"]:checked')?.value || null;

    // Condition
    let condition = document.querySelector('input[name="productCondition"]:checked')?.value || 'used';
    if (condition === 'other') {
      condition = document.getElementById('customConditionInput').value.trim() || 'Other';
    }

    // Payment
    let paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
    if (paymentMethod === 'other') {
      paymentMethod = document.getElementById('customPaymentInput').value.trim() || 'Other';
    }

    // Contact (defaults to 'message' if unselected)
    const contactMethod = document.querySelector('input[name="contactMethod"]:checked')?.value || 'message';
    const contactHandle = document.getElementById('contactHandleInput')?.value.trim() || '';

    // Front image verification
    const frontImgSrc = document.getElementById('preview-front')?.src || '';
    if (!frontImgSrc) {
      alert('Please provide at least a Front View photo for your listing.');
      return;
    }

    pendingProductData = {
      title: title,
      price: price,
      isNegotiable: isNegotiable,
      category: category,
      gender: selectedGender || 'unisex',
      size: selectedSize || 'Free Size',
      condition: condition,
      location: location,
      description: description,
      paymentMethod: paymentMethod,
      contactMethod: contactMethod,
      contactHandle: contactHandle
    };

    // Update modal preview
    document.getElementById('modalPreviewImg').src = frontImgSrc;
    document.getElementById('modalPreviewTitle').textContent = title;
    document.getElementById('modalPreviewPrice').textContent = `฿${price.toLocaleString()}`;
    document.getElementById('modalPreviewCategory').textContent = categoryLabel;
    document.getElementById('modalPreviewGender').textContent = (selectedGender || 'UNISEX').toUpperCase();
    document.getElementById('modalPreviewSize').textContent = `📏 Size: ${selectedSize || 'Standard'}`;
    document.getElementById('modalPreviewCondition').textContent = `✨ ${condition.toUpperCase()}`;
    document.getElementById('modalPreviewLocation').textContent = `📍 ${location}`;

    const modalNegotiable = document.getElementById('modalPreviewNegotiable');
    if (isNegotiable) {
      modalNegotiable.classList.remove('hide');
    } else {
      modalNegotiable.classList.add('hide');
    }

    modal.classList.remove('hide');
  });

  btnEdit?.addEventListener('click', () => {
    modal.classList.add('hide');
  });

  btnConfirm?.addEventListener('click', async () => {
    if (!pendingProductData) return;

    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Publishing...';

    try {
      const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
      if (authError || !user) {
        alert('Please log in before publishing a listing.');
        return;
      }

      const frontFile = document.getElementById('imgFront').files[0];
      const backFile = document.getElementById('imgBack').files[0];
      const leftFile = document.getElementById('imgLeftSide').files[0];
      const rightFile = document.getElementById('imgRightSide').files[0];

      // Upload selected photos concurrently[cite: 21, 28]
      const [frontUrl, backUrl, leftUrl, rightUrl] = await Promise.all([
        uploadProductImage(frontFile, 'front'),
        uploadProductImage(backFile, 'back'),
        uploadProductImage(leftFile, 'left'),
        uploadProductImage(rightFile, 'right')
      ]);

      const newListing = {
        title: pendingProductData.title,
        price: pendingProductData.price,
        is_negotiable: pendingProductData.isNegotiable,
        category: pendingProductData.category,
        gender: pendingProductData.gender,
        size: pendingProductData.size,
        condition: pendingProductData.condition,
        location: pendingProductData.location,
        description: pendingProductData.description,
        payment_method: pendingProductData.paymentMethod,
        contact_method: pendingProductData.contactMethod,
        contact_handle: pendingProductData.contactHandle,
        image_front_url: frontUrl,
        image_back_url: backUrl,
        image_left_url: leftUrl,
        image_right_url: rightUrl,
        seller_id: user.id
      };

      await insertProductListing(newListing); // Insert into Supabase products table[cite: 21, 28]

      modal.classList.add('hide');
      alert('🎉 Product listed successfully on Supabase!');
      window.location.href = 'marketplace.html';
    } catch (err) {
      console.error('Publishing failed:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.textContent = 'Confirm & Publish';
    }
  });
}