// --- GLOBÁLIS ADATOK ÉS ÁLLAPOTOK ---
let userBalance = 100.00;
let isSpinning = false;
let activeCase = null;
let activeBattle = null;

// MEGBÍZHATÓ SVG KÉPEK ÉS SKINEK
const SKIN_DATABASE = [
  { id: 1, name: "P250 | Neon Grid", price: 2.50, img: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/crosshair.svg" },
  { id: 2, name: "AK-47 | Cyber Strike", price: 24.00, img: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.svg" },
  { id: 3, name: "M4A4 | Void Runner", price: 55.00, img: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield.svg" },
  { id: 4, name: "AWP | Hyperion", price: 140.00, img: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/target.svg" },
  { id: 5, name: "★ Karambit | Nebula", price: 1250.00, img: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sword.svg" }
];

const OFFICIAL_CASES = [
  { id: 'starter', name: 'Starter Box', price: 5.00, img: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg' },
  { id: 'hyper', name: 'Cyberpunk Case', price: 25.00, img: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/package.svg' },
  { id: 'knife', name: 'Exotic Knife Box', price: 250.00, img: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/archive.svg' }
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
  setupNavigation();
  setupBorrowCalculator();
  setupModalEvents();
  renderCasesCatalog();
  renderBattlesLobby();
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

// SOLO LÁDANYITÁS SPINNER
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

  const cardWidth = 150 + 12;
  const targetX = -(55 * cardWidth) + (document.querySelector('.roulette-container').offsetWidth / 2) - (cardWidth / 2);

  setTimeout(() => {
    track.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.1, 1)';
    track.style.transform = `translateX(${targetX}px)`;
  }, 50);

  setTimeout(() => {
    isSpinning = false;
    alert(`Gratulálunk! Nyertél egy ${wonItem.name} skint ($${wonItem.price.toFixed(2)})!`);
  }, 4700);
}

// CASE BATTLES LOGIKA (1v1 BOT)
function renderBattlesLobby() {
  const list = document.getElementById('battles-list');
  list.innerHTML = `
    <div class="battle-room-item">
      <div>
        <strong style="font-size:1.1rem; color:#fff;">⚔️ Cyber Strike 1v1 Battle</strong>
        <p style="color:var(--text-muted); font-size:0.85rem;">1x Cyberpunk Case ($25.00)</p>
      </div>
      <button class="btn btn-primary" onclick="startBattleRoom(25)">CSATLAKOZÁS ($25)</button>
    </div>
  `;
}

function createNewBattle() {
  if (userBalance < 25) return alert("Nincs elég egyenleged ($25) csata nyitásához!");
  startBattleRoom(25);
}

function startBattleRoom(cost) {
  if (userBalance < cost) return alert("Nincs elég egyenleged a belépéshez!");
  userBalance -= cost;
  updateBalanceUI();

  activeBattle = { cost: cost, p1Total: 0, p2Total: 0 };
  document.getElementById('battle-arena').classList.remove('hidden');
  document.getElementById('p1-total').innerText = '$0.00';
  document.getElementById('p2-total').innerText = '$0.00';
  document.getElementById('p1-drop-slot').innerHTML = `<span class="slot-placeholder">Pörgetésre vár...</span>`;
  document.getElementById('p2-drop-slot').innerHTML = `<span class="slot-placeholder">Pörgetésre vár...</span>`;
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
      const pot = p1Item.price + p2Item.price;
      userBalance += pot;
      updateBalanceUI();
      alert(`GYŐZELEM! Te nyerted a csatát! Nyereményed: $${pot.toFixed(2)}`);
    } else {
      alert(`VESZTETTÉL! A Bot magasabb értéket nyitott.`);
    }
  }, 500);
}

function closeBattleArena() {
  document.getElementById('battle-arena').classList.add('hidden');
  activeBattle = null;
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
    document.getElementById('borrow-backer-pays').innerText = `$${backerPays.toFixed(2)} USD`;
    document.getElementById('borrow-user-pays').innerText = `$${userPays.toFixed(2)} USD`;
    document.getElementById('borrow-user-cut').innerText = `${userPercent}%`;
  }

  amountInput.addEventListener('input', calculate);
  slider.addEventListener('input', calculate);

  document.getElementById('submit-borrow-req').addEventListener('click', () => {
    alert("Borrow kérelem beküldve! Amint egy finanszírozó elfogadja, indul a szponzorált csata.");
  });
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

// MODAL HANDLING
function setupModalEvents() {
  const modal = document.getElementById('auth-modal');
  document.getElementById('open-auth-btn').onclick = () => modal.classList.remove('hidden');
  document.getElementById('close-auth-btn').onclick = () => modal.classList.add('hidden');
  document.getElementById('open-deposit-btn').onclick = () => {
    userBalance += 50;
    updateBalanceUI();
    alert("$50.00 Sikeresen feltöltve a számládra!");
  };
}
