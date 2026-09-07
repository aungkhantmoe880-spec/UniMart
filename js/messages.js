let currentUserId = null;
let activeConversationId = null;
let messageSubscription = null;

document.addEventListener('DOMContentLoaded', async () => {
  const checkSession = setInterval(async () => {
    if (window.currentUser) {
      clearInterval(checkSession);
      currentUserId = window.currentUser.id;
      initMessages();
    }
  }, 50);
});

async function initMessages() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetSellerId = urlParams.get('seller');
  const targetProductId = urlParams.get('product');

  // If redirected from a listing with ?seller=...&product=...
  if (targetSellerId && targetSellerId !== currentUserId) {
    activeConversationId = await getOrCreateConversation(targetSellerId, targetProductId);
  }

  await loadConversations();

  if (activeConversationId) {
    selectConversation(activeConversationId);
  }

  setupMessageSending();
}

// 1. Fetch or initialize conversation between buyer and seller
async function getOrCreateConversation(sellerId, productId) {
  // Check for existing conversation
  const { data: existing } = await window.supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', currentUserId)
    .eq('seller_id', sellerId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) return existing.id;

  // Otherwise create new conversation
  const { data: newConvo, error } = await window.supabase
    .from('conversations')
    .insert([{
      buyer_id: currentUserId,
      seller_id: sellerId,
      product_id: productId
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
  return newConvo.id;
}

// 2. Load conversations list for current user
async function loadConversations() {
  const listEl = document.getElementById('conversationList');

  const { data: convos, error } = await window.supabase
    .from('conversations')
    .select('*')
    .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
    .order('last_message_at', { ascending: false });

  if (error || !convos || convos.length === 0) {
    listEl.innerHTML = '<p class="empty-state-chat">No conversations yet.</p>';
    return;
  }

  // Fetch counterparty profiles and product info
  const itemsHtml = await Promise.all(convos.map(async (c) => {
    const otherId = c.buyer_id === currentUserId ? c.seller_id : c.buyer_id;

    const [profileRes, prodRes] = await Promise.all([
      window.supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).maybeSingle(),
      c.product_id ? window.supabase.from('products').select('title').eq('id', c.product_id).maybeSingle() : Promise.resolve({ data: null })
    ]);

    const name = profileRes.data?.full_name || 'UniMart User';
    const avatar = profileRes.data?.avatar_url || 'https://via.placeholder.com/44?text=User';
    const productTitle = prodRes.data?.title ? `• ${prodRes.data.title}` : '';

    return `
      <div class="convo-item ${c.id === activeConversationId ? 'active' : ''}" data-id="${c.id}">
        <img class="convo-avatar" src="${avatar}" alt="Avatar" />
        <div class="convo-details">
          <h4>${escapeHtml(name)} <small style="font-weight: normal; color: #64748b;">${escapeHtml(productTitle)}</small></h4>
          <p class="convo-last-msg">${escapeHtml(c.last_message || 'Started a conversation')}</p>
        </div>
      </div>
    `;
  }));

  listEl.innerHTML = itemsHtml.join('');

  // Add click listeners to items
  listEl.querySelectorAll('.convo-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      selectConversation(id);
    });
  });
}

// 3. Open selected conversation and subscribe to live messages
async function selectConversation(convoId) {
  activeConversationId = convoId;

  // Update UI selection state
  document.querySelectorAll('.convo-item').forEach(i => {
    i.classList.toggle('active', i.getAttribute('data-id') === convoId);
  });

  const headerEl = document.getElementById('chatHeader');
  const formEl = document.getElementById('chatForm');
  headerEl.classList.remove('hidden');
  formEl.classList.remove('hidden');

  // Load conversation partner header info
  const { data: convo } = await window.supabase
    .from('conversations')
    .select('*')
    .eq('id', convoId)
    .single();

  if (convo) {
    const otherId = convo.buyer_id === currentUserId ? convo.seller_id : convo.buyer_id;
    const [profileRes, prodRes] = await Promise.all([
      window.supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).maybeSingle(),
      convo.product_id ? window.supabase.from('products').select('title').eq('id', convo.product_id).maybeSingle() : Promise.resolve({ data: null })
    ]);

    document.getElementById('activeChatName').textContent = profileRes.data?.full_name || 'UniMart User';
    if (profileRes.data?.avatar_url) {
      document.getElementById('activeChatAvatar').src = profileRes.data.avatar_url;
    }
    document.getElementById('activeChatProduct').textContent = prodRes.data?.title ? `Listing: ${prodRes.data.title}` : 'General Inquiry';
  }

  // Load existing messages
  await loadMessages(convoId);

  // Subscribe to real-time incoming messages
  subscribeToMessages(convoId);
}

// 4. Fetch message history
async function loadMessages(convoId) {
  const messagesBox = document.getElementById('chatMessages');

  const { data: messages, error } = await window.supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convoId)
    .order('created_at', { ascending: true });

  if (error || !messages || messages.length === 0) {
    messagesBox.innerHTML = '<div class="chat-placeholder"><p>Say hello to start the conversation!</p></div>';
    return;
  }

  messagesBox.innerHTML = messages.map(m => `
    <div class="message-bubble ${m.sender_id === currentUserId ? 'outgoing' : 'incoming'}">
      ${escapeHtml(m.content)}
    </div>
  `).join('');

  messagesBox.scrollTop = messagesBox.scrollHeight;
}

// 5. Send message and update conversation preview
function setupMessageSending() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('messageInput');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = input.value.trim();
    if (!content || !activeConversationId) return;

    input.value = '';

    // Optimistically render bubble
    const messagesBox = document.getElementById('chatMessages');
    const placeholder = messagesBox.querySelector('.chat-placeholder');
    if (placeholder) placeholder.remove();

    const tempBubble = document.createElement('div');
    tempBubble.className = 'message-bubble outgoing';
    tempBubble.textContent = content;
    messagesBox.appendChild(tempBubble);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    // Insert message into DB
    const { error: msgErr } = await window.supabase
      .from('messages')
      .insert([{
        conversation_id: activeConversationId,
        sender_id: currentUserId,
        content: content
      }]);

    if (msgErr) console.error('Failed to send:', msgErr);

    // Update last_message on conversation
    await window.supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString()
      })
      .eq('id', activeConversationId);

    loadConversations();
  });
}

// 6. Supabase Realtime channel subscription
function subscribeToMessages(convoId) {
  if (messageSubscription) {
    window.supabase.removeChannel(messageSubscription);
  }

  messageSubscription = window.supabase
    .channel(`messages:${convoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convoId}`
      },
      (payload) => {
        // Only append if it's an incoming message from the partner
        if (payload.new && payload.new.sender_id !== currentUserId) {
          const messagesBox = document.getElementById('chatMessages');
          const placeholder = messagesBox.querySelector('.chat-placeholder');
          if (placeholder) placeholder.remove();

          const bubble = document.createElement('div');
          bubble.className = 'message-bubble incoming';
          bubble.textContent = payload.new.content;
          messagesBox.appendChild(bubble);
          messagesBox.scrollTop = messagesBox.scrollHeight;
        }
      }
    )
    .subscribe();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}