// --- GLOBÁLIS ADATOK ÉS ÁLLAPOTOK ---
let authToken = localStorage.getItem('token') || null;
let currentUser = null;
let isSpinning = false;
let activeCase = null;

// VALÓDI CS2 SKINEK ÉS HI VIZUÁLIS ADATOK
const SKIN_DATABASE = [
  { name: "P250 | Ripple", price: 1.50, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" },
  { name: "AK-47 | Point Disarray", price: 18.50, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" },
  { name: "M4A4 | Desolate Space", price: 45.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" },
  { name: "AWP | Hyper Beast", price: 120.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" },
  { name: "★ Karambit | Doppler", price: 1450.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn" }
];

const OFFICIAL_CASES = [
  { id: 'starter', name: 'Budget Edition', price: 5.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn' },
  { id: 'hyper', name: 'Hyper Beast Edition', price: 25.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn' },
  { id: 'knife', name: 'Knife & Gold Only', price: 250.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4rdY6WGP-4oXN48558BARLri81EWQo9-i8ig88_9vE4x9i1I4R-O1_RA9mKgNY_L-2aQJ11_33c2A309-8pInczqS1ZevXwW8G7pxwiOyUoIn231a3qENpYWrzcYDDJ1RsaAzV_1K8wOe915K0vpzA13R9seZK2OAn' }
];

function getRarityClass(price) {
  if (price >= 1000) return 'gold';
  if (price >= 100) return 'covert';
  if (price >= 30) return 'classified';
  if (price >= 10) return 'restricted';
  return 'milspec';
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  renderCasesCatalog();
  initLiveFeed();
  initCreatorSkins();
  renderBattleRooms();

  document.getElementById('open-case-btn').addEventListener('click', handleOpenCase);
});

// --- TAB MENÜ VÁLTÓ ---
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(`tab-${tabId}`).classList.add('active');
  event.target.classList.add('active');
}

// --- 1. LÁDA KATALÓGUS ÉS NYITÁS ---
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

function openCaseView(caseId) {
  activeCase = OFFICIAL_CASES.find(c => c.id === caseId);
  document.getElementById('case-catalog-view').style.display = 'none';
  document.getElementById('case-opener-view').style.display = 'block';

  document.getElementById('active-case-name').innerText = activeCase.name;
  document.getElementById('active-case-price-text').innerText = `Nyisd ki a ládát $${activeCase.price.toFixed(2)} áron`;
  document.getElementById('open-case-btn').innerText = `LÁDA NYITÁSA ($${activeCase.price.toFixed(2)})`;

  // Láda tartalma
  const grid = document.getElementById('case-items-grid');
  grid.innerHTML = SKIN_DATABASE.map(item => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img}" alt="${item.name}">
      <div class="item-name">${item.name}</div>
      <div class="item-price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
}

function closeCaseView() {
  document.getElementById('case-opener-view').style.display = 'none';
  document.getElementById('case-catalog-view').style.display = 'block';
}

function handleOpenCase() {
  if (isSpinning) return;
  isSpinning = true;

  const wonItem = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
  startSpinnerAnimation(wonItem, () => {
    isSpinning = false;
    addLiveFeedDrop('Te', wonItem);
  });
}

function startSpinnerAnimation(wonItem, onComplete) {
  const track = document.getElementById('spinner-track');
  track.style.transition = 'none';
  track.style.transform = 'translateX(0px)';

  const spinnerList = [];
  for (let i = 0; i < 80; i++) {
    if (i === 75) spinnerList.push(wonItem);
    else spinnerList.push(SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)]);
  }

  track.innerHTML = spinnerList.map(item => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img}" alt="${item.name}">
      <div class="item-name">${item.name}</div>
      <div class="item-price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');

  const cardWidth = 145 + 12;
  const targetX = -(75 * cardWidth) + (document.querySelector('.spinner-wrapper').offsetWidth / 2) - (cardWidth / 2);

  setTimeout(() => {
    track.style.transition = 'transform 5s cubic-bezier(0.12, 0.8, 0.15, 1)';
    track.style.transform = `translateX(${targetX}px)`;
  }, 50);

  setTimeout(onComplete, 5050);
}

// --- 2. CASE BATTLES (CSATÁK) ---
function renderBattleRooms() {
  const list = document.getElementById('battles-list');
  list.innerHTML = `
    <div class="battle-room-card">
      <div>
        <strong style="font-size: 1.2rem;">Hyper Beast Battle (1v1)</strong>
        <p style="color: var(--text-muted); font-size: 0.85rem;">2x Hyper Beast Edition Case ($50.00)</p>
      </div>
      <div class="battle-players">
        <div class="player-slot filled">P1</div>
        <div class="player-slot">BOT</div>
      </div>
      <button class="btn btn-gold" onclick="joinBattle('1v1-hyper')">CSATLAKOZÁS ($25.00)</button>
    </div>
  `;
}

function joinBattle(battleId) {
  alert('Csatlakoztál a csatához! A szoba indul...');
}

// --- 3. LÁDA ÉPÍTŐ & BORROW MÓD ---
function initCreatorSkins() {
  const grid = document.getElementById('creator-skins-grid');
  grid.innerHTML = SKIN_DATABASE.map(item => `
    <div class="item-card ${getRarityClass(item.price)}" style="cursor:pointer;" onclick="toggleCreatorSkin(this)">
      <img src="${item.img}" alt="${item.name}">
      <div class="item-name">${item.name}</div>
      <div class="item-price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
}

function toggleCreatorSkin(el) {
  el.classList.toggle('selected');
}

function saveCustomCase() {
  const name = document.getElementById('custom-case-name').value;
  if (!name) return alert('Kérlek adj meg egy nevet a ládádnak!');
  alert(`A "${name}" nevű egyedi ládád sikeresen publikálva lett!`);
}

function claimBorrowCredit() {
  alert('$100.00 Borrow hitelkeret jóváírva a fiókodon!');
  const bal = document.getElementById('user-balance');
  bal.innerText = '$100.00';
}

// --- ÉLŐ FEED DROPS ---
function initLiveFeed() {
  const track = document.getElementById('live-feed-track');
  const fakeUsers = ['Alex99', 'GamerPro', 'CSGO_King', 'Slayer'];
  
  setInterval(() => {
    const randomUser = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
    const randomSkin = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
    addLiveFeedDrop(randomUser, randomSkin);
  }, 4000);
}

function addLiveFeedDrop(user, item) {
  const track = document.getElementById('live-feed-track');
  const el = document.createElement('div');
  el.className = `feed-item ${getRarityClass(item.price)}`;
  el.innerHTML = `
    <img src="${item.img}" alt="${item.name}">
    <div class="feed-item-info">
      <span style="color:var(--text-muted);">${user}</span>
      <span style="font-weight:bold;">${item.name}</span>
    </div>
  `;
  track.prepend(el);
  if (track.children.length > 10) track.removeChild(track.lastChild);
}

// MODAL HANDLING
function openAuthModal() { document.getElementById('auth-modal').style.display = 'flex'; }
function closeAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }
function openDepositModal() { document.getElementById('deposit-modal').style.display = 'flex'; }
function closeDepositModal() { document.getElementById('deposit-modal').style.display = 'none'; }
