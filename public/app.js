// --- GLOBÁLIS ADATOK ---
let userBalance = 100.00;
let isSpinning = false;
let activeCase = null;

const SKIN_DATABASE = [
  { id: 1, name: "P250 | Ripple", price: 1.50, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" },
  { id: 2, name: "AK-47 | Point Disarray", price: 18.50, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" },
  { id: 3, name: "M4A4 | Desolate Space", price: 45.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" },
  { id: 4, name: "AWP | Hyper Beast", price: 120.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" },
  { id: 5, name: "★ Karambit | Doppler", price: 1450.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" }
];

const OFFICIAL_CASES = [
  { id: 'starter', name: 'Starter Box', price: 5.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn' },
  { id: 'hyper', name: 'Hyper Beast Case', price: 25.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn' },
  { id: 'knife', name: 'Knife Only Box', price: 250.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn' }
];

function getRarityClass(price) {
  if (price >= 1000) return 'gold';
  if (price >= 100) return 'covert';
  if (price >= 30) return 'classified';
  if (price >= 10) return 'restricted';
  return 'milspec';
}

// --- DOM READY INIT ---
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupModalEvents();
  setupBorrowCalculator();
  renderCasesCatalog();
  renderBattles();
  initLiveFeed();

  document.getElementById('open-case-btn').addEventListener('click', handleOpenCase);
  document.getElementById('back-to-catalog-btn').addEventListener('click', closeCaseView);
});

// NAVIGÁCIÓ
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabTarget = e.target.getAttribute('data-tab');
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

      e.target.classList.add('active');
      document.getElementById(`tab-${tabTarget}`).classList.add('active');
    });
  });
}

// LÁDAKATALÓGUS RENDER
function renderCasesCatalog() {
  const grid = document.getElementById('cases-grid');
  grid.innerHTML = OFFICIAL_CASES.map(c => `
    <div class="case-card" onclick="openCaseView('${c.id}')">
      <img src="${c.img}" alt="${c.name}">
      <h3>${c.name}</h3>
      <div class="price">$${c.price.toFixed(2)}</div>
    </div>
  `).join('');
}

window.openCaseView = function(caseId) {
  activeCase = OFFICIAL_CASES.find(c => c.id === caseId);
  document.getElementById('case-catalog-view').classList.add('hidden');
  document.getElementById('case-opener-view').classList.remove('hidden');

  document.getElementById('active-case-name').innerText = activeCase.name;
  document.getElementById('active-case-price-text').innerText = `$${activeCase.price.toFixed(2)} USD`;

  const grid = document.getElementById('case-items-grid');
  grid.innerHTML = SKIN_DATABASE.map(item => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img}">
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
};

function closeCaseView() {
  document.getElementById('case-opener-view').classList.add('hidden');
  document.getElementById('case-catalog-view').classList.remove('hidden');
}

// PÖRGETÉS ANIMÁCIÓ
function handleOpenCase() {
  if (isSpinning) return;
  if (userBalance < activeCase.price) {
    alert("Nincs elég egyenleged a pörgetéshez!");
    return;
  }

  userBalance -= activeCase.price;
  updateBalanceUI();
  isSpinning = true;

  const wonItem = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
  const track = document.getElementById('spinner-track');
  
  track.style.transition = 'none';
  track.style.transform = 'translateX(0px)';

  let spinnerList = [];
  for (let i = 0; i < 60; i++) {
    if (i === 55) spinnerList.push(wonItem);
    else spinnerList.push(SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)]);
  }

  track.innerHTML = spinnerList.map(item => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img}">
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');

  const cardWidth = 140 + 10;
  const targetX = -(55 * cardWidth) + (document.querySelector('.spinner-wrapper').offsetWidth / 2) - (cardWidth / 2);

  setTimeout(() => {
    track.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.1, 1)';
    track.style.transform = `translateX(${targetX}px)`;
  }, 50);

  setTimeout(() => {
    isSpinning = false;
    alert(`Gratulálunk! Nyertél egy ${wonItem.name} skint ($${wonItem.price})!`);
  }, 4700);
}

// BORROW KALKULÁTOR
function setupBorrowCalculator() {
  const amountInput = document.getElementById('borrow-total-amount');
  const slider = document.getElementById('borrow-slider');

  function calculate() {
    const total = parseFloat(amountInput.value) || 0;
    const backerPercent = parseInt(slider.value);
    const userPercent = 100 - backerPercent;

    const backerPays = total * (backerPercent / 100);
    const userPays = total * (userPercent / 100);

    document.getElementById('borrow-percent-label').innerText = `${backerPercent}%`;
    document.getElementById('borrow-backer-pays').innerText = `$${backerPays.toFixed(2)}`;
    document.getElementById('borrow-user-pays').innerText = `$${userPays.toFixed(2)}`;
    document.getElementById('borrow-user-cut').innerText = `${userPercent}%`;
  }

  amountInput.addEventListener('input', calculate);
  slider.addEventListener('input', calculate);

  document.getElementById('submit-borrow-req').addEventListener('click', () => {
    alert("Borrow kérelem beküldve! Amint egy szponzor elfogadja, indul a csata.");
  });
}

function renderBattles() {
  const list = document.getElementById('battles-list');
  list.innerHTML = `
    <div class="battle-card">
      <div>
        <strong>🔥 1v1 Hyper Battle</strong>
        <p class="subtitle">2x Hyper Beast Case ($50.00)</p>
      </div>
      <button class="btn btn-gold" onclick="alert('Csatlakoztál a csatához!')">CSATLAKOZÁS ($50)</button>
    </div>
  `;
}

function updateBalanceUI() {
  document.getElementById('user-balance').innerText = `$${userBalance.toFixed(2)}`;
}

function initLiveFeed() {
  const track = document.getElementById('live-feed-track');
  setInterval(() => {
    const item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
    const el = document.createElement('div');
    el.className = `feed-item ${getRarityClass(item.price)}`;
    el.innerHTML = `<img src="${item.img}"><span>${item.name}</span>`;
    track.prepend(el);
    if (track.children.length > 8) track.removeChild(track.lastChild);
  }, 3500);
}

// MODAL ESEMÉNYEK
function setupModalEvents() {
  const modal = document.getElementById('auth-modal');
  document.getElementById('open-auth-btn').onclick = () => modal.classList.remove('hidden');
  document.getElementById('close-auth-btn').onclick = () => modal.classList.add('hidden');
}
