// --- GLOBÁLIS ÁLLAPOTOK ---
let authToken = localStorage.getItem('token') || null;
let currentUser = null;
let isSpinning = false;
let isRegisterMode = false;

function getRarityClass(price) {
  if (price >= 1000) return 'gold';
  if (price >= 100) return 'covert';
  if (price >= 30) return 'classified';
  if (price >= 10) return 'restricted';
  return 'milspec';
}

// --- INITIALIZÁCIÓ ---
document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    fetchUserProfile();
  }
  loadCaseItems();
  loadInventory();

  document.getElementById('open-case-btn').addEventListener('click', handleOpenCase);
});

// --- USER PROFIL ÉS EGYENLEG LEKÉRÉSE ---
async function fetchUserProfile() {
  try {
    const res = await fetch('/api/user/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) throw new Error('Unauthenticated');
    
    currentUser = await res.json();
    updateUIUserStats();
  } catch (err) {
    console.warn('Munkamenet lejárt vagy érvénytelen token.');
    localStorage.removeItem('token');
    authToken = null;
    updateUIUserStats();
  }
}

function updateUIUserStats() {
  const authBtn = document.getElementById('auth-btn');
  const balanceEl = document.getElementById('user-balance');

  if (currentUser) {
    balanceEl.innerText = `$${currentUser.balance.toFixed(2)}`;
    authBtn.innerText = `${currentUser.username} (Kijelentkezés)`;
    authBtn.onclick = logout;
  } else {
    balanceEl.innerText = '$0.00';
    authBtn.innerText = 'Bejelentkezés';
    authBtn.onclick = openAuthModal;
  }
}

function logout() {
  localStorage.removeItem('token');
  authToken = null;
  currentUser = null;
  updateUIUserStats();
  loadInventory();
}

// --- AUTH MODAL KEZELÉS (BEJELENTKEZÉS / REGISZTRÁCIÓ) ---
function openAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  isRegisterMode = !isRegisterMode;

  const title = document.getElementById('auth-title');
  const submitBtn = document.getElementById('auth-submit-btn');
  const emailGroup = document.getElementById('email-group');
  const toggleText = document.getElementById('auth-toggle-text');
  const toggleBtn = document.getElementById('auth-toggle-btn');

  if (isRegisterMode) {
    title.innerText = 'Regisztráció';
    submitBtn.innerText = 'REGISZTRÁCIÓ';
    emailGroup.style.display = 'flex';
    toggleText.innerText = 'Már van fiókod?';
    toggleBtn.innerText = 'Bejelentkezés';
  } else {
    title.innerText = 'Bejelentkezés';
    submitBtn.innerText = 'BEJELENTKEZÉS';
    emailGroup.style.display = 'none';
    toggleText.innerText = 'Nincs még fiókod?';
    toggleBtn.innerText = 'Regisztráció';
  }
}

async function handleAuthSubmit() {
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const email = document.getElementById('auth-email').value;

  if (!username || !password || (isRegisterMode && !email)) {
    alert('Kérlek tölts ki minden mezőt!');
    return;
  }

  const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
  const bodyData = isRegisterMode ? { username, email, password } : { username, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Azonosítási hiba!');
      return;
    }

    // Sikeres Auth
    authToken = data.token;
    localStorage.setItem('token', authToken);
    currentUser = data.user;

    updateUIUserStats();
    closeAuthModal();
    loadInventory();

  } catch (err) {
    alert('Szerver hiba az azonosítás során!');
  }
}

// --- DEPOSIT MODAL KEZELÉS ---
function openDepositModal() {
  if (!authToken) {
    alert('Befizetéshez először jelentkezz be!');
    openAuthModal();
    return;
  }
  document.getElementById('deposit-modal').style.display = 'flex';
}

function closeDepositModal() {
  document.getElementById('deposit-modal').style.display = 'none';
}

async function processDeposit() {
  const amount = parseFloat(document.getElementById('deposit-amount').value);
  const currency = document.getElementById('deposit-currency').value;

  if (!amount || amount < 5) {
    alert('A minimális befizetés $5.00!');
    return;
  }

  try {
    const res = await fetch('/api/payments/create-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ amount, currency })
    });

    const data = await res.json();

    if (res.ok && data.paymentUrl) {
      alert(`Fizetési hivatkozás létrehozva!\nTranzakció ID: ${data.orderId}`);
      window.open(data.paymentUrl, '_blank');
      closeDepositModal();
    } else {
      alert(data.error || 'A fizetési hivatkozás létrehozása nem sikerült.');
    }
  } catch (err) {
    alert('Szerver hiba a fizetés indításakor.');
  }
}

// --- LÁDA TARTALMA (LOOT TABLE) ---
function loadCaseItems() {
  const defaultItems = [
    { name: "P250 | Ripple", price: 1.20, img: "https://via.placeholder.com/150/4b69ff?text=P250" },
    { name: "AK-47 | Point Disarray", price: 18.50, img: "https://via.placeholder.com/150/8847ff?text=AK-47" },
    { name: "M4A4 | Desolate Space", price: 45.00, img: "https://via.placeholder.com/150/d32ce6?text=M4A4" },
    { name: "AWP | Hyper Beast", price: 120.00, img: "https://via.placeholder.com/150/eb4b4b?text=AWP+Hyper" },
    { name: "★ Karambit | Gamma Doppler", price: 1450.00, img: "https://via.placeholder.com/150/caab05?text=Karambit" }
  ];

  const grid = document.getElementById('case-items-grid');
  grid.innerHTML = defaultItems.map(item => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img}" alt="${item.name}">
      <div class="item-name">${item.name}</div>
      <div class="item-price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
}

// --- PÖRGETÉSI LOGIKA ÉS ANIMÁCIÓ ---
async function handleOpenCase() {
  if (isSpinning) return;
  if (!authToken) {
    alert('Kérlek, jelentkezz be a ládanyitáshoz!');
    openAuthModal();
    return;
  }

  isSpinning = true;
  const openBtn = document.getElementById('open-case-btn');
  openBtn.disabled = true;
  openBtn.innerText = "PÖRGETÉS...";

  try {
    const res = await fetch('/api/game/open-case', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ caseId: 'hyper_beast' })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Hiba történt a ládanyitás során!');
      isSpinning = false;
      openBtn.disabled = false;
      openBtn.innerText = "LÁDA NYITÁSA ($25.00)";
      return;
    }

    currentUser.balance = data.newBalance;
    updateUIUserStats();

    startSpinnerAnimation(data.allItems, data.wonItem, () => {
      isSpinning = false;
      openBtn.disabled = false;
      openBtn.innerText = "LÁDA NYITÁSA ($25.00)";
      loadInventory();
    });

  } catch (err) {
    alert('Hálózati hiba történt.');
    isSpinning = false;
    openBtn.disabled = false;
    openBtn.innerText = "LÁDA NYITÁSA ($25.00)";
  }
}

function startSpinnerAnimation(allItems, wonItem, onComplete) {
  const track = document.getElementById('spinner-track');
  track.style.transition = 'none';
  track.style.transform = 'translateX(0px)';

  const spinnerList = [];
  const totalCards = 80;
  const winningIndex = 75;

  for (let i = 0; i < totalCards; i++) {
    if (i === winningIndex) {
      spinnerList.push(wonItem);
    } else {
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
      spinnerList.push(randomItem);
    }
  }

  track.innerHTML = spinnerList.map(item => `
    <div class="item-card ${getRarityClass(item.price || item.item_price)}">
      <img src="${item.img || item.item_image}" alt="${item.name || item.item_name}">
      <div class="item-name">${item.name || item.item_name}</div>
      <div class="item-price">$${(item.price || item.item_price).toFixed(2)}</div>
    </div>
  `).join('');

  const cardWidth = 140 + 10;
  const wrapperWidth = document.querySelector('.spinner-wrapper').offsetWidth;
  const randomOffset = Math.floor(Math.random() * 80) - 40; 
  const targetX = -(winningIndex * cardWidth) + (wrapperWidth / 2) - (cardWidth / 2) + randomOffset;

  setTimeout(() => {
    track.style.transition = 'transform 5s cubic-bezier(0.15, 0.88, 0.1, 0.98)';
    track.style.transform = `translateX(${targetX}px)`;
  }, 50);

  setTimeout(() => {
    if (onComplete) onComplete();
  }, 5050);
}

// --- LELTÁR (INVENTORY) ÉS TÁRGY ELADÁS ---
async function loadInventory() {
  const container = document.getElementById('inventory-grid');
  if (!container) return;

  if (!authToken) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Jelentkezz be a leltárad megtekintéséhez.</div>`;
    return;
  }

  try {
    const res = await fetch('/api/user/inventory', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) return;

    const items = await res.json();
    renderInventory(items);
  } catch (err) {
    console.error('Leltár betöltési hiba:', err);
  }
}

function renderInventory(items) {
  const container = document.getElementById('inventory-grid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">A leltárad jelenleg üres. Nyiss egy ládát!</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="item-card ${getRarityClass(item.item_price)}" id="inv-item-${item.id}">
      <img src="${item.item_image}" alt="${item.item_name}">
      <div class="item-name">${item.item_name}</div>
      <div class="item-price">$${item.item_price.toFixed(2)}</div>
      <button class="btn btn-sell" onclick="sellItem(${item.id})">
        ELADÁS
      </button>
    </div>
  `).join('');
}

async function sellItem(inventoryId) {
  if (!authToken) return;

  try {
    const res = await fetch('/api/user/sell-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ inventoryId })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      currentUser.balance = data.newBalance;
      updateUIUserStats();

      const itemElement = document.getElementById(`inv-item-${inventoryId}`);
      if (itemElement) {
        itemElement.style.transform = 'scale(0.8)';
        itemElement.style.opacity = '0';
        setTimeout(() => itemElement.remove(), 200);
      }
    } else {
      alert(data.error || 'A tárgy eladása nem sikerült.');
    }
  } catch (err) {
    console.error('Eladási hiba:', err);
  }
}
