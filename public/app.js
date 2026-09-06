const CARD_WIDTH = 152; // 140px szélesség + 12px margó
const WINNER_INDEX = 65; // A nyertes kártya fix indexe a szalagon

let authMode = 'login'; // 'login' vagy 'register'
let authToken = localStorage.getItem('jwt_token') || null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    fetchProfile();
  } else {
    updateAuthUI(false);
  }
});

// --- AUTHENTICATION ---
function openAuthModal(mode) {
  authMode = mode;
  const modal = document.getElementById('authModal');
  const title = document.getElementById('modalTitle');
  const emailGroup = document.getElementById('emailGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const errorDiv = document.getElementById('authError');

  errorDiv.classList.add('hidden');
  
  if (mode === 'register') {
    title.innerText = 'Regisztráció';
    emailGroup.classList.remove('hidden');
    submitBtn.innerText = 'Regisztráció';
  } else {
    title.innerText = 'Bejelentkezés';
    emailGroup.classList.add('hidden');
    submitBtn.innerText = 'Bejelentkezés';
  }

  modal.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('authUsername').value;
  const password = document.getElementById('authPassword').value;
  const email = document.getElementById('authEmail').value;
  const errorDiv = document.getElementById('authError');

  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const payload = authMode === 'register' ? { username, email, password } : { username, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      errorDiv.innerText = data.error || 'Hiba történt!';
      errorDiv.classList.remove('hidden');
      return;
    }

    authToken = data.token;
    localStorage.setItem('jwt_token', authToken);
    closeAuthModal();
    fetchProfile();
  } catch (err) {
    errorDiv.innerText = 'Hálózati hiba történt!';
    errorDiv.classList.remove('hidden');
  }
}

function logout() {
  authToken = null;
  localStorage.removeItem('jwt_token');
  updateAuthUI(false);
  document.getElementById('inventoryGrid').innerHTML = '<div class="empty-msg">Jelentkezz be a raktárad megtekintéséhez!</div>';
  document.getElementById('pfCard').classList.add('hidden');
}

function updateAuthUI(isLoggedIn, userData = null) {
  const authContainer = document.getElementById('authContainer');
  const userProfile = document.getElementById('userProfile');

  if (isLoggedIn && userData) {
    authContainer.classList.add('hidden');
    userProfile.classList.remove('hidden');
    document.getElementById('userBalance').innerText = `$${userData.balance.toFixed(2)}`;
    document.getElementById('userNameTag').innerText = userData.username;
    
    // Provably Fair adatok frissítése
    if (userData.serverSeedHash) {
      document.getElementById('pfServerHash').innerText = userData.serverSeedHash;
      document.getElementById('pfClientSeed').innerText = userData.clientSeed;
      document.getElementById('pfNonce').innerText = userData.nonce;
      document.getElementById('pfCard').classList.remove('hidden');
    }
  } else {
    authContainer.classList.remove('hidden');
    userProfile.classList.add('hidden');
  }
}

// --- USER PROFILE & INVENTORY ---
async function fetchProfile() {
  try {
    const res = await fetch('/api/user/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const userData = await res.json();
    updateAuthUI(true, userData);
    fetchInventory();
  } catch (err) {
    console.error('Profile fetch failed:', err);
  }
}

async function fetchInventory() {
  try {
    const res = await fetch('/api/user/inventory', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const items = await res.json();
    const container = document.getElementById('inventoryGrid');
    container.innerHTML = '';

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-msg">Még nincsenek tárgyaid a raktárban.</div>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'inv-card';
      card.style.borderBottom = `3px solid ${item.item_color}`;
      card.innerHTML = `
        <img src="${item.item_image}">
        <div style="font-size:12px; font-weight:bold;">${item.item_name}</div>
        <div style="color:var(--accent-green); font-size:12px; margin-top:4px;">$${item.item_price.toFixed(2)}</div>
        <button class="sell-btn" onclick="sellItem(${item.id})">Eladás</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Inventory fetch failed:', err);
  }
}

async function sellItem(inventoryId) {
  try {
    const res = await fetch('/api/user/sell-item', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inventoryId })
    });

    const data = await res.json();
    if (data.success) {
      fetchProfile();
    }
  } catch (err) {
    alert('Hiba történt az eladás során.');
  }
}

// --- SPINNER GAMBLING ENGINE ---
async function spinCase() {
  if (!authToken) {
    openAuthModal('login');
    return;
  }

  const spinBtn = document.getElementById('spinBtn');
  spinBtn.disabled = true;

  try {
    const res = await fetch('/api/game/open-case', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ caseId: 'hyper_beast' })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Hiba a pörgetésnél!');
      spinBtn.disabled = false;
      return;
    }

    const track = document.getElementById('spinnerTrack');
    track.style.transition = 'none';
    track.style.transform = 'translateX(0px)';
    track.innerHTML = '';

    // Szalag feltöltése szimulált kártyákkal
    for (let i = 0; i < 80; i++) {
      const item = (i === WINNER_INDEX) ? data.wonItem : data.allItems[Math.floor(Math.random() * data.allItems.length)];
      const card = document.createElement('div');
      card.className = 'item-card';
      card.style.borderBottomColor = item.color;
      card.innerHTML = `
        <img src="${item.img}">
        <div class="name">${item.name}</div>
        <div class="price">$${item.price.toFixed(2)}</div>
      `;
      track.appendChild(card);
    }

    // Fizikai lassulási animáció (Cubic-Bezier)
    setTimeout(() => {
      const viewportWidth = track.parentElement.clientWidth;
      const targetOffset = (WINNER_INDEX * CARD_WIDTH) - (viewportWidth / 2) + (CARD_WIDTH / 2);

      track.style.transition = 'transform 6s cubic-bezier(0.05, 0.9, 0.1, 1)';
      track.style.transform = `translateX(-${targetOffset}px)`;
    }, 50);

    // Animáció vége
    setTimeout(() => {
      document.getElementById('winImg').src = data.wonItem.img;
      document.getElementById('winName').innerText = data.wonItem.name;
      document.getElementById('winPrice').innerText = `$${data.wonItem.price.toFixed(2)}`;
      document.getElementById('winModal').classList.remove('hidden');

      fetchProfile();
      spinBtn.disabled = false;
    }, 6200);

  } catch (err) {
    alert('Szerver hiba a ládanyitáskor!');
    spinBtn.disabled = false;
  }
}

function closeWinModal() {
  document.getElementById('winModal').classList.add('hidden');
}
