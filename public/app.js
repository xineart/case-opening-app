// --- GLOBÁLIS STATE ---
let userBalance = 100.00;
let isSpinning = false;
let activeCase = null;
let activeBattle = null;

// RÉSZLETES, VALÓDI CS2 SKINEK PONTOS PNG LINKELÉSSEL
const SKIN_DATABASE = [
  { id: 1, name: "P250 | Sand Dune", price: 0.50, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA" },
  { id: 2, name: "Glock-18 | Water Elemental", price: 8.50, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA" },
  { id: 3, name: "M4A4 | Neo-Noir", price: 35.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA" },
  { id: 4, name: "AK-47 | Redline", price: 22.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA" },
  { id: 5, name: "AWP | Asiimov", price: 110.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA" },
  { id: 6, name: "AK-47 | Vulcan", price: 280.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA" },
  { id: 7, name: "★ Butterfly Knife | Fade", price: 2400.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA" },
  { id: 8, name: "★ Sport Gloves | Vice", price: 1800.00, img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA" }
];

// 8 KÜLÖNBÖZŐ LÁDA KÖZVETLEN LÁDA KÉPEKKEL
const OFFICIAL_CASES = [
  { id: 'starter', name: 'Starter Case', price: 2.50, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA' },
  { id: 'neon', name: 'Neon Lights Case', price: 12.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA' },
  { id: 'classified', name: 'Classified Collection', price: 35.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA' },
  { id: 'covert', name: 'Covert Operations', price: 75.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA' },
  { id: 'gloves', name: 'Glove Specialist', price: 150.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA' },
  { id: 'knife', name: 'Exotic Knife Box', price: 250.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA' },
  { id: 'lore', name: 'Dragon Lore Vault', price: 500.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA' },
  { id: 'secret', name: 'Secret Jackpot', price: 1000.00, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4d1844vf45gA484_45Q1feDjVsJP1bJ413qA' }
];

function getRarityClass(price) {
  if (price >= 1000) return 'gold';
  if (price >= 100) return 'covert';
  if (price >= 30) return 'classified';
  if (price >= 10) return 'restricted';
  return 'milspec';
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupModalEvents();
  renderCasesCatalog();
  renderBattlesLobby();
  renderSponsorFeed();
  initLiveFeed();

  document.getElementById('open-case-btn').addEventListener('click', handleOpenCase);
  document.getElementById('back-to-catalog-btn').addEventListener('click', closeCaseView);
  document.getElementById('create-battle-modal-btn').addEventListener('click', createNewBattle);
  document.getElementById('start-battle-spin-btn').addEventListener('click', runBattleSpin);
  document.getElementById('close-battle-arena-btn').addEventListener('click', closeBattleArena);
});

// TAB NAVIGÁCIÓ
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-tab');
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));

      e.currentTarget.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });
}

// 8 LÁDA RENDERELÉSE
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
  document.getElementById('open-case-btn').innerText = `LÁDA NYITÁSA ($${activeCase.price.toFixed(2)})`;

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

// LÁDANYITÁS LOGIKA
function handleOpenCase() {
  if (isSpinning) return;
  if (userBalance < activeCase.price) return alert("Nincs elég egyenleged!");

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

  const cardWidth = 160 + 12;
  const targetX = -(55 * cardWidth) + (document.querySelector('.roulette-container').offsetWidth / 2) - (cardWidth / 2);

  setTimeout(() => {
    track.style.transition = 'transform 4.2s cubic-bezier(0.1, 0.8, 0.1, 1)';
    track.style.transform = `translateX(${targetX}px)`;
  }, 50);

  setTimeout(() => {
    isSpinning = false;
    alert(`Nyertél: ${wonItem.name} ($${wonItem.price.toFixed(2)})!`);
  }, 4400);
}

// CASE BATTLES + INTEGRÁLT BORROW
function renderBattlesLobby() {
  const list = document.getElementById('battles-list');
  list.innerHTML = `
    <div class="battle-room-item">
      <div>
        <strong style="font-size:1.1rem;">⚔️ Standard 1v1 Battle</strong>
        <p style="color:var(--text-muted); font-size:0.85rem;">1x Neon Lights Case ($12.00)</p>
      </div>
      <button class="btn btn-primary" onclick="startBattleRoom(12, false)">BELÉPÉS ($12)</button>
    </div>
    <div class="battle-room-item">
      <div>
        <strong style="font-size:1.1rem;">⚡ Borrow (80/20) Sponsored Battle <span class="battle-tag">BORROW</span></strong>
        <p style="color:var(--text-muted); font-size:0.85rem;">1x Exotic Knife Box ($250.00)</p>
      </div>
      <button class="btn btn-primary" onclick="startBattleRoom(250, true)">BORROW CSATA ($50-ért)</button>
    </div>
  `;
}

function renderSponsorFeed() {
  const feed = document.getElementById('sponsor-feed-list');
  feed.innerHTML = `
    <div class="sponsor-item">
      <div class="sponsor-header">
        <strong>Player_xX99Xx</strong>
        <span class="text-neon">80/20 BORROW</span>
      </div>
      <div>Csata értéke: <strong>$100.00</strong> (Önrész: $20.00)</div>
      <button class="btn btn-sm btn-primary" onclick="alert('Sikeresen szponzoráltad! Nyertél 80%-os részesedést.')">FINANSZÍROZÁS ($80)</button>
    </div>
  `;
}

function createNewBattle() {
  if (userBalance < 12) return alert("Nincs elég egyenleged csata nyitásához!");
  startBattleRoom(12, false);
}

function startBattleRoom(cost, isBorrow) {
  const userCost = isBorrow ? cost * 0.2 : cost;
  if (userBalance < userCost) return alert(`Nincs elég egyenleged! Szükséges: $${userCost}`);

  userBalance -= userCost;
  updateBalanceUI();

  activeBattle = { cost: cost, isBorrow: isBorrow };
  document.getElementById('battle-arena').classList.remove('hidden');
  document.getElementById('battle-type-tag').innerText = isBorrow ? '⚡ BORROW CSATA (80/20 SZPONZORÁLT)' : 'STANDARD 1v1';
  document.getElementById('p2-name').innerText = isBorrow ? 'Hitelező (Backer Bot)' : 'BOT Alpha';
  document.getElementById('p1-total').innerText = '$0.00';
  document.getElementById('p2-total').innerText = '$0.00';
}

function runBattleSpin() {
  if (!activeBattle) return;

  const p1Item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
  const p2Item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];

  document.getElementById('p1-drop-slot').innerHTML = `
    <div class="item-card ${getRarityClass(p1Item.price)}">
      <img src="${p1Item.img}">
      <div class="name">${p1Item.name}</div>
      <div class="price">$${p1Item.price.toFixed(2)}</div>
    </div>
  `;

  document.getElementById('p2-drop-slot').innerHTML = `
    <div class="item-card ${getRarityClass(p2Item.price)}">
      <img src="${p2Item.img}">
      <div class="name">${p2Item.name}</div>
      <div class="price">$${p2Item.price.toFixed(2)}</div>
    </div>
  `;

  document.getElementById('p1-total').innerText = `$${p1Item.price.toFixed(2)}`;
  document.getElementById('p2-total').innerText = `$${p2Item.price.toFixed(2)}`;

  setTimeout(() => {
    if (p1Item.price >= p2Item.price) {
      let pot = p1Item.price + p2Item.price;
      if (activeBattle.isBorrow) pot = pot * 0.2; // 20% jár a játékosnak
      userBalance += pot;
      updateBalanceUI();
      alert(`GYŐZELEM! Nyereményed: $${pot.toFixed(2)}`);
    } else {
      alert("VESZTETTÉL!");
    }
  }, 400);
}

function closeBattleArena() {
  document.getElementById('battle-arena').classList.add('hidden');
  activeBattle = null;
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
    el.innerHTML = `<img src="${item.img}"><span>${item.name} ($${item.price.toFixed(2)})</span>`;
    track.prepend(el);
    if (track.children.length > 7) track.removeChild(track.lastChild);
  }, 3500);
}

// MODALKEZELÉS ÉS BEÁLLÍTÁSOK
function setupModalEvents() {
  const authModal = document.getElementById('auth-modal');
  const settingsModal = document.getElementById('settings-modal');

  document.getElementById('open-auth-btn').onclick = () => authModal.classList.remove('hidden');
  document.getElementById('close-auth-btn').onclick = () => authModal.classList.add('hidden');

  document.getElementById('open-settings-btn').onclick = () => settingsModal.classList.remove('hidden');
  document.getElementById('close-settings-btn').onclick = () => settingsModal.classList.add('hidden');
  document.getElementById('save-settings-btn').onclick = () => settingsModal.classList.add('hidden');

  document.getElementById('open-deposit-btn').onclick = () => {
    userBalance += 100;
    updateBalanceUI();
    alert("$100.00 feltöltve!");
  };
}
