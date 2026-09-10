let pendingListingPayload = null;
let editProductId = null;
let existingImageUrls = {
  front: null,
  back: null,
  left: null,
  right: null
};

document.addEventListener('DOMContentLoaded', async () => {
  // Check session and load avatar
  const { data: { user } } = await window.supabase.auth.getUser();
  if (user) {
    loadNavbarAvatar(user.id);
  }

  // Setup file slots
  setupSlotHandlers('slot-front', 'imgFront', 'preview-front', 'label-front', 'actions-front', 'front');
  setupSlotHandlers('slot-back', 'imgBack', 'preview-back', 'label-back', 'actions-back', 'back');
  setupSlotHandlers('slot-left', 'imgLeftSide', 'preview-left', 'label-left', 'actions-left', 'left');
  setupSlotHandlers('slot-right', 'imgRightSide', 'preview-right', 'label-right', 'actions-right', 'right');

  // Input listeners
  setupDescriptionCounter();
  setupQuickLocationButtons();
  setupCategoryToggle();
  setupConditionToggle();
  setupPaymentToggle();
  setupContactToggle();
  setupDeselectableRadios();
  setupLightboxListeners();
  setupFormSubmission();

  // Check for edit query param
  const urlParams = new URLSearchParams(window.location.search);
  editProductId = urlParams.get('edit');

  if (editProductId) {
    loadExistingProductForEdit(editProductId);
  }
});

// Load logged-in student avatar in top bar
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
    console.warn('Avatar load error:', e);
  }
}

// Pre-fill form if editing an existing listing
async function loadExistingProductForEdit(productId) {
  try {
    const { data: p, error } = await window.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !p) {
      alert('Could not retrieve product for editing.');
      return;
    }

    // Update Header Text for Edit Mode
    const headerTitle = document.querySelector('h1');
    const publishBtnSpan = document.querySelector('#btnSubmitForm span:last-child');
    if (headerTitle) headerTitle.textContent = 'Edit Your Product';
    if (publishBtnSpan) publishBtnSpan.textContent = 'Republish Changes';

    // 1. Text Inputs
    document.getElementById('productName').value = p.title || '';
    document.getElementById('productPrice').value = p.price || 0;
    document.getElementById('productLocation').value = p.location || '';
    document.getElementById('productDescription').value = p.description || '';
    document.getElementById('isNegotiable').checked = Boolean(p.is_negotiable);

    // Update description counter
    const counter = document.getElementById('charCounter');
    if (counter) counter.textContent = `${(p.description || '').length} / 800`;

    // 2. Category
    const catSelect = document.getElementById('productCategory');
    const customCat = document.getElementById('customCategoryInput');
    const standardCategories = ['clothing', 'electronics', 'books', 'dorm'];

    if (standardCategories.includes(p.category)) {
      catSelect.value = p.category;
    } else if (p.category) {
      catSelect.value = 'other';
      customCat.classList.remove('hidden');
      customCat.value = p.category;
    }

    // 3. Gender
    if (p.gender) {
      const gRadio = document.querySelector(`input[name="productGender"][value="${p.gender.toLowerCase()}"]`);
      if (gRadio) {
        gRadio.checked = true;
        gRadio.dataset.wasChecked = 'true';
      }
    }

    // 4. Size
    if (p.size) {
      const sRadio = document.querySelector(`input[name="productSize"][value="${p.size}"]`);
      if (sRadio) {
        sRadio.checked = true;
        sRadio.dataset.wasChecked = 'true';
      }
    }

    // 5. Condition
    const standardConditions = ['new', 'like-new', 'used'];
    if (standardConditions.includes(p.condition)) {
      const cRadio = document.querySelector(`input[name="productCondition"][value="${p.condition}"]`);
      if (cRadio) {
        cRadio.checked = true;
        cRadio.dataset.wasChecked = 'true';
      }
    } else if (p.condition) {
      const otherRadio = document.getElementById('conditionOtherRadio');
      const customCond = document.getElementById('customConditionInput');
      if (otherRadio) {
        otherRadio.checked = true;
        otherRadio.dataset.wasChecked = 'true';
      }
      if (customCond) {
        customCond.classList.remove('hidden');
        customCond.value = p.condition;
      }
    }

    // 6. Payment
    const standardPayments = ['qr', 'transfer', 'cash'];
    if (standardPayments.includes(p.payment_method)) {
      const payRadio = document.querySelector(`input[name="paymentMethod"][value="${p.payment_method}"]`);
      if (payRadio) {
        payRadio.checked = true;
        payRadio.dataset.wasChecked = 'true';
      }
    } else if (p.payment_method) {
      const otherPayRadio = document.getElementById('paymentOtherRadio');
      const customPay = document.getElementById('customPaymentInput');
      if (otherPayRadio) {
        otherPayRadio.checked = true;
        otherPayRadio.dataset.wasChecked = 'true';
      }
      if (customPay) {
        customPay.classList.remove('hidden');
        customPay.value = p.payment_method;
      }
    }

    // 7. Contact
    if (p.contact_method) {
      const contRadio = document.querySelector(`input[name="contactMethod"][value="${p.contact_method}"]`);
      if (contRadio) {
        contRadio.checked = true;
        contRadio.dataset.wasChecked = 'true';
      }
    }
    const handleInput = document.getElementById('contactHandleInput');
    if (handleInput) {
      handleInput.value = p.contact_handle || '';
      handleInput.placeholder = p.contact_method === 'telegram' ? 'Enter your Telegram @username' : 'Enter your LINE ID';
    }

    // 8. Pre-fill Image Slots
    populateImageSlotPreview('front', p.image_front_url);
    populateImageSlotPreview('back', p.image_back_url);
    populateImageSlotPreview('left', p.image_left_url);
    populateImageSlotPreview('right', p.image_right_url);

    // Make front image not strictly required by HTML5 file validator since existing photo is already available
    if (p.image_front_url) {
      document.getElementById('imgFront').removeAttribute('required');
    }

  } catch (err) {
    console.error('Error prefilling form:', err);
  }
}

// Populate slot with existing uploaded URL
function populateImageSlotPreview(slotKey, url) {
  if (!url) return;
  existingImageUrls[slotKey] = url;

  const preview = document.getElementById(`preview-${slotKey}`);
  const label = document.getElementById(`label-${slotKey}`);
  const actions = document.getElementById(`actions-${slotKey}`);

  if (preview && label && actions) {
    preview.src = url;
    preview.classList.remove('hidden');
    label.classList.add('hidden');
    actions.classList.remove('hidden');
  }
}

// 4-Slot Photo Handler
function setupSlotHandlers(slotId, inputId, previewId, labelId, actionsId, slotKey) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const label = document.getElementById(labelId);
  const actions = document.getElementById(actionsId);

  if (!input || !preview || !label || !actions) return;

  const btnView = actions.querySelector('.btn-slot-view');
  const btnDelete = actions.querySelector('.btn-slot-delete');

  input.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        label.classList.add('hidden');
        actions.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  btnView?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (preview.src) {
      const modal = document.getElementById('imageLightboxModal');
      const img = document.getElementById('uploadLightboxImg');
      img.src = preview.src;
      modal.classList.add('active');
    }
  });

  btnDelete?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.value = '';
    preview.src = '';
    preview.classList.add('hidden');
    actions.classList.add('hidden');
    label.classList.remove('hidden');
    existingImageUrls[slotKey] = null;

    if (slotKey === 'front') {
      input.setAttribute('required', 'true');
    }
  });
}

// Toggle & Deselect Logic
function setupDeselectableRadios() {
  const groupNames = ['productGender', 'productSize', 'productCondition', 'paymentMethod', 'contactMethod'];

  groupNames.forEach((name) => {
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    radios.forEach((radio) => {
      radio.addEventListener('click', function () {
        if (this.dataset.wasChecked === 'true') {
          this.checked = false;
          this.dataset.wasChecked = 'false';

          if (name === 'productCondition') {
            document.getElementById('customConditionInput')?.classList.add('hidden');
          }
          if (name === 'paymentMethod') {
            document.getElementById('customPaymentInput')?.classList.add('hidden');
          }
          if (name === 'contactMethod') {
            const handleInput = document.getElementById('contactHandleInput');
            if (handleInput) {
              handleInput.value = '';
              handleInput.placeholder = 'Select LINE or Telegram above to enter username';
            }
          }
        } else {
          radios.forEach(r => r.dataset.wasChecked = 'false');
          this.dataset.wasChecked = 'true';
        }
      });
    });
  });

  document.querySelectorAll('.toggle-group-container').forEach((container) => {
    container.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-toggle-option') && !e.target.closest('input')) {
        const group = container.getAttribute('data-group');
        const radios = container.querySelectorAll(`input[name="${group}"]`);
        radios.forEach((r) => {
          r.checked = false;
          r.dataset.wasChecked = 'false';
        });

        if (group === 'productCondition') {
          document.getElementById('customConditionInput')?.classList.add('hidden');
        }
        if (group === 'paymentMethod') {
          document.getElementById('customPaymentInput')?.classList.add('hidden');
        }
        if (group === 'contactMethod') {
          const handleInput = document.getElementById('contactHandleInput');
          if (handleInput) {
            handleInput.value = '';
            handleInput.placeholder = 'Select LINE or Telegram above to enter username';
          }
        }
      }
    });
  });
}

// Description Character Counter
function setupDescriptionCounter() {
  const desc = document.getElementById('productDescription');
  const counter = document.getElementById('charCounter');
  if (desc && counter) {
    desc.addEventListener('input', () => {
      counter.textContent = `${desc.value.length} / 800`;
    });
  }
}

// Quick Location Fillers
function setupQuickLocationButtons() {
  const input = document.getElementById('productLocation');
  document.querySelectorAll('.quick-loc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (input) {
        input.value = btn.getAttribute('data-loc');
        input.focus();
      }
    });
  });
}

// Category Toggle
function setupCategoryToggle() {
  const select = document.getElementById('productCategory');
  const customInput = document.getElementById('customCategoryInput');

  select?.addEventListener('change', () => {
    if (select.value === 'other') {
      customInput.classList.remove('hidden');
      customInput.focus();
    } else {
      customInput.classList.add('hidden');
      customInput.value = '';
    }
  });
}

// Condition Toggle
function setupConditionToggle() {
  const customInput = document.getElementById('customConditionInput');
  document.querySelectorAll('input[name="productCondition"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'other') {
        customInput.classList.remove('hidden');
        customInput.focus();
      } else {
        customInput.classList.add('hidden');
        customInput.value = '';
      }
    });
  });
}

// Payment Toggle
function setupPaymentToggle() {
  const customInput = document.getElementById('customPaymentInput');
  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'other') {
        customInput.classList.remove('hidden');
        customInput.focus();
      } else {
        customInput.classList.add('hidden');
        customInput.value = '';
      }
    });
  });
}

// Contact Toggle
function setupContactToggle() {
  const handleInput = document.getElementById('contactHandleInput');
  document.querySelectorAll('input[name="contactMethod"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'line') {
        handleInput.placeholder = 'Enter your LINE ID';
      } else if (radio.value === 'telegram') {
        handleInput.placeholder = 'Enter your Telegram @username';
      }
      handleInput.focus();
    });
  });
}

// Fullscreen Photo Lightbox Handlers
function setupLightboxListeners() {
  const modal = document.getElementById('imageLightboxModal');
  const closeBtn = document.getElementById('uploadLightboxClose');

  const close = () => modal?.classList.remove('active');

  closeBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      close();
    }
  });
}

// Form Submission: Supports both INSERT (new) and UPDATE (republish)
function setupFormSubmission() {
  const form = document.getElementById('uploadForm');
  const modal = document.getElementById('previewModal');
  const btnEdit = document.getElementById('btnEditListing');
  const btnConfirm = document.getElementById('btnConfirmPublish');

  if (!form || !modal) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedConditionRadio = document.querySelector('input[name="productCondition"]:checked');
    if (!selectedConditionRadio) {
      alert('Please select the item condition (New, Like New, Used, or Other).');
      return;
    }

    const selectedPaymentRadio = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedPaymentRadio) {
      alert('Please select an accepted payment method.');
      return;
    }

    const selectedContactRadio = document.querySelector('input[name="contactMethod"]:checked');
    if (!selectedContactRadio) {
      alert('Please select your preferred contact channel (LINE or Telegram).');
      return;
    }

    const contactHandle = document.getElementById('contactHandleInput').value.trim();
    if (!contactHandle) {
      alert('Please enter your contact handle/ID.');
      return;
    }

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

    // Gender & Size
    const selectedGender = document.querySelector('input[name="productGender"]:checked')?.value || 'unisex';
    const selectedSize = document.querySelector('input[name="productSize"]:checked')?.value || 'Free Size';

    // Condition
    let condition = selectedConditionRadio.value;
    if (condition === 'other') {
      condition = document.getElementById('customConditionInput').value.trim() || 'Other';
    }

    // Payment
    let paymentMethod = selectedPaymentRadio.value;
    if (paymentMethod === 'other') {
      paymentMethod = document.getElementById('customPaymentInput').value.trim() || 'Other';
    }

    const contactMethod = selectedContactRadio.value;

    // Verify Front Photo (either newly chosen file or existing URL)
    const frontPreview = document.getElementById('preview-front');
    if (!frontPreview.src || frontPreview.classList.contains('hidden')) {
      alert('Please provide at least a Front View photo for your listing.');
      return;
    }

    pendingListingPayload = {
      title,
      price,
      is_negotiable: isNegotiable,
      category,
      gender: selectedGender,
      size: selectedSize,
      condition,
      location,
      description,
      payment_method: paymentMethod,
      contact_method: contactMethod,
      contact_handle: contactHandle
    };

    // Populate Modal Preview
    document.getElementById('modalPreviewImg').src = frontPreview.src;
    document.getElementById('modalPreviewTitle').textContent = title;
    document.getElementById('modalPreviewPrice').textContent = `฿${price.toLocaleString()}`;
    document.getElementById('modalPreviewCategory').textContent = categoryLabel.split(' ')[0] || category;
    document.getElementById('modalPreviewLocation').textContent = `📍 ${location}`;
    document.getElementById('modalPreviewCondition').textContent = condition.toUpperCase();

    // Change preview button text depending on mode
    if (btnConfirm) {
      btnConfirm.innerHTML = editProductId ? '<span>Republish Listing</span>' : '<span>Confirm & Publish</span>';
    }

    modal.classList.add('active');
  });

  btnEdit?.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  btnConfirm?.addEventListener('click', async () => {
    if (!pendingListingPayload) return;

    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Saving...';

    try {
      const { data: { user }, error: authErr } = await window.supabase.auth.getUser();
      if (authErr || !user) {
        alert('Please log in before submitting.');
        window.location.href = 'login.html';
        return;
      }

      const frontFile = document.getElementById('imgFront').files[0];
      const backFile = document.getElementById('imgBack').files[0];
      const leftFile = document.getElementById('imgLeftSide').files[0];
      const rightFile = document.getElementById('imgRightSide').files[0];

      // Upload newly chosen files, or preserve existing URLs
      const [frontUrl, backUrl, leftUrl, rightUrl] = await Promise.all([
        frontFile ? uploadProductImage(frontFile, 'front') : Promise.resolve(existingImageUrls.front),
        backFile ? uploadProductImage(backFile, 'back') : Promise.resolve(existingImageUrls.back),
        leftFile ? uploadProductImage(leftFile, 'left') : Promise.resolve(existingImageUrls.left),
        rightFile ? uploadProductImage(rightFile, 'right') : Promise.resolve(existingImageUrls.right)
      ]);

      const record = {
        ...pendingListingPayload,
        image_front_url: frontUrl,
        image_back_url: backUrl,
        image_left_url: leftUrl,
        image_right_url: rightUrl
      };

      if (editProductId) {
        // UPDATE existing listing in Supabase
        const { error: updateErr } = await window.supabase
          .from('products')
          .update(record)
          .eq('id', editProductId)
          .eq('seller_id', user.id);

        if (updateErr) throw updateErr;

        modal.classList.remove('active');
        alert('Product listing updated and republished successfully!');
        window.location.href = 'mylisting.html';
      } else {
        // INSERT new listing into Supabase
        record.seller_id = user.id;
        await insertProductListing(record);

        modal.classList.remove('active');
        alert('Product listed successfully in the campus marketplace!');
        window.location.href = 'marketplace.html';
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert(`Submission failed: ${err.message}`);
      btnConfirm.disabled = false;
      btnConfirm.textContent = editProductId ? 'Republish Listing' : 'Confirm & Publish';
    }
  });
}