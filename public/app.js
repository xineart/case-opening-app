// --- GLOBÁLIS ÁLLAPOTOK ---
let authToken = localStorage.getItem('token') || null;
let currentUser = null;
let isSpinning = false;

// CSS Osztály leképezés a tárgyak ára és ritkasága alapján
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
  }
}

function updateUIUserStats() {
  if (currentUser) {
    document.getElementById('user-balance').innerText = `$${currentUser.balance.toFixed(2)}`;
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) authBtn.innerText = currentUser.username;
  }
}

// --- LÁDA TARTALMÁNAK BETÖLTÉSE (LOOT TABLE) ---
function loadCaseItems() {
  // Példa adatok a felület kezdeti feltöltéséhez (a backend hívás ezt írja felül)
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

// --- PÖRGETÉSI LOGIKA ÉS ANIMÁCIÓ (ROULETTE SPINNER) ---
async function handleOpenCase() {
  if (isSpinning) return;
  if (!authToken) {
    alert('Kérlek, jelentkezz be a ládanyitáshoz!');
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

    // Egyenleg azonnali levonásának megjelenítése (optimista frissítés)
    currentUser.balance = data.newBalance;
    updateUIUserStats();

    // Pörgető csík feltöltése és az animáció elindítása
    startSpinnerAnimation(data.allItems, data.wonItem, () => {
      // Animáció vége callback
      isSpinning = false;
      openBtn.disabled = false;
      openBtn.innerText = "LÁDA NYITÁSA ($25.00)";
      
      // Leltár frissítése az új tárggyal
      loadInventory();
    });

  } catch (err) {
    console.error(err);
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

  // 1. Pörgetési sorozat összeállítása (80 véletlenszerű tárgy + a nyert tárgy a 75. helyen)
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

  // 2. Kártyák renderelése a pörgető sávba
  track.innerHTML = spinnerList.map(item => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img || item.item_image}" alt="${item.name || item.item_name}">
      <div class="item-name">${item.name || item.item_name}</div>
      <div class="item-price">$${(item.price || item.item_price).toFixed(2)}</div>
    </div>
  `).join('');

  // 3. Eltolás kiszámítása pixelben (Kártya szélesség + Margó)
  const cardWidth = 140 + 10; // 140px széles kártya + 10px gap
  const wrapperWidth = document.querySelector('.spinner-wrapper').offsetWidth;
  
  // Kis véletlenszerű eltolás (offset), hogy ne pontosan a kártya közepén álljon meg mindig
  const randomOffset = Math.floor(Math.random() * 80) - 40; 
  const targetX = -(winningIndex * cardWidth) + (wrapperWidth / 2) - (cardWidth / 2) + randomOffset;

  // 4. Animáció elindítása CSS tranzícióval
  setTimeout(() => {
    track.style.transition = 'transform 5s cubic-bezier(0.15, 0.88, 0.1, 0.98)';
    track.style.transform = `translateX(${targetX}px)`;
  }, 50);

  // 5. Animáció befejezése 5 másodperc múlva
  setTimeout(() => {
    if (onComplete) onComplete();
  }, 5050);
}

// --- LELTÁR (INVENTORY) ÉS TÁRGY ELADÁS LOGIKA ---
async function loadInventory() {
  if (!authToken) return;

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
      <button class="btn btn-sell" onclick="sellItem(${item.id}, ${item.item_price})">
        ELADÁS
      </button>
    </div>
  `).join('');
}

async function sellItem(inventoryId, price) {
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
      // Egyenleg frissítése
      currentUser.balance = data.newBalance;
      updateUIUserStats();

      // Tárgy eltávolítása a felületről animációval
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
