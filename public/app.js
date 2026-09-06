// --- VALÓDI, KÖZVETLENÜL BETÖLTŐ NYÍLT CS2 SKINEK ÉS LÁDÁK ---
const SKIN_DATABASE = [
  { id: 1, name: "P250 | Sand Dune", price: 0.50, color: "#4b69ff", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_p250_cu_p250_sand_dune_light_png" },
  { id: 2, name: "Glock-18 | Water Elemental", price: 8.50, color: "#8847ff", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_glock_cu_glock_water_elemental_light_png" },
  { id: 3, name: "AK-47 | Redline", price: 22.00, color: "#d32ce6", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_ak47_cu_ak47_cobra_light_png" },
  { id: 4, name: "M4A4 | Neo-Noir", price: 35.00, color: "#eb4b4b", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_m4a1_cu_m4a4_neo_noir_light_png" },
  { id: 5, name: "AWP | Asiimov", price: 110.00, color: "#eb4b4b", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_awp_cu_awp_asimov_light_png" },
  { id: 6, name: "AK-47 | Vulcan", price: 280.00, color: "#eb4b4b", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_ak47_cu_ak47_vulcan_light_png" },
  { id: 7, name: "★ Karambit | Fade", price: 2400.00, color: "#ffd700", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_knife_karambit_an_fade_light_png" }
];

const OFFICIAL_CASES = [
  { id: 'terb-starter', name: 'Starter Case', price: 2.50, color: "#4b69ff", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/weapon_cases/crate_community_1_png" },
  { id: 'terb-neon', name: 'Neon Collection', price: 12.00, color: "#8847ff", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/weapon_cases/crate_community_2_png" },
  { id: 'terb-classified', name: 'Covert Case', price: 35.00, color: "#d32ce6", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/weapon_cases/crate_community_3_png" },
  { id: 'terb-knife', name: 'Knife & Gold Box', price: 250.00, color: "#ffd700", img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/weapon_cases/crate_community_4_png" }
];

// TRANSLATIONS
const TRANSLATIONS = {
  hu: {
    liveDrops: "ÉLŐ DROPOK", navCases: "LÁDÁK", navBattles: "CASE BATTLES", navUpgrader: "UPGRADER",
    balanceLabel: "EGYENLEG", loginBtn: "BEJELENTKEZÉS", casesTitle: "LOOTBOX STÍLUSÚ LÁDÁK",
    casesSub: "Exkluzív skinek a legmagasabb nyerési esélyekkel", multiOpen: "Nyitási darabszám:",
    caseContents: "LÁDA TARTALMA ÉS DROPRATE", inventoryTitle: "SAJÁT LELTÁR (INVENTORY)",
    emptyInv: "Még nem nyertél tárgyat.", battlesSub: "Átlátható csaták, real-time multiplayer élmény és 80/20 Borrow szponzoráció.",
    openBattles: "NYITOTT CSATÁK (LOBBY)", borrowDesc: "Finanszírozd más játékos belépőjének 80%-át! Cserébe a nyereményének 80%-a a tiéd lesz.",
    upgraderSub: "Tedd kockára meglévő skinedet vagy egyenlegedet a magasabb értékű tárgyakért!",
    yourStake: "1. SAJÁT TÉT", chanceLabel: "ESÉLY", targetSkin: "2. CÉLZOTT SKIN"
  },
  en: {
    liveDrops: "LIVE DROPS", navCases: "CASES", navBattles: "CASE BATTLES", navUpgrader: "UPGRADER",
    balanceLabel: "BALANCE", loginBtn: "LOGIN", casesTitle: "LOOTBOX STYLE CASES",
    casesSub: "Exclusive skins with highest drop rates", multiOpen: "Open quantity:",
    caseContents: "CASE CONTENTS & DROPRATES", inventoryTitle: "YOUR INVENTORY",
    emptyInv: "No items in inventory yet.", battlesSub: "Transparent battles, real-time multiplayer experience and 80/20 Borrow feature.",
    openBattles: "OPEN BATTLES (LOBBY)", borrowDesc: "Sponsor 80% of another player's entry fee! Get 80% of their winnings in return.",
    upgraderSub: "Risk your existing skin or balance for higher value items!",
    yourStake: "1. YOUR STAKE", chanceLabel: "CHANCE", targetSkin: "2. TARGET SKIN"
  }
};

// STATE
let currentLang = 'hu';
let isLoggedIn = false;
let currentUser = null;
let userBalance = 100.00;
let isSpinning = false;
let activeCase = null;
let activeBattle = null;
let userInventory = [];
let multiOpenCount = 1;

// AUDIO
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playClickSound() {
  if (!document.getElementById('sfx-toggle').checked) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.05);
}

function playWinSound() {
  if (!document.getElementById('sfx-toggle').checked) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.4);
}

function getRarityClass(price) {
  if (price >= 1000) return 'gold';
  if (price >= 100) return 'covert';
  if (price >= 30) return 'classified';
  if (price >= 10) return 'restricted';
  return 'milspec';
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAuthAndModals();
  renderCasesCatalog();
  renderBattlesLobby();
  renderSponsorFeed();
  initLiveFeed();
  initUpgrader();

  document.getElementById('open-case-btn').addEventListener('click', handleOpenCase);
  document.getElementById('back-to-catalog-btn').addEventListener('click', closeCaseView);
  document.getElementById('create-battle-modal-btn').addEventListener('click', createNewBattle);
  document.getElementById('start-battle-spin-btn').addEventListener('click', runBattleSpin);
  document.getElementById('close-battle-arena-btn').addEventListener('click', closeBattleArena);

  document.querySelectorAll('.btn-multi').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-multi').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      multiOpenCount = parseInt(e.target.getAttribute('data-count'));
      updateMultiSpinners();
    });
  });
});

// AUTH & MODAL SYSTEM
function setupAuthAndModals() {
  const loginModal = document.getElementById('login-modal');
  const settingsModal = document.getElementById('settings-modal');

  document.getElementById('open-login-btn').onclick = () => loginModal.classList.remove('hidden');
  document.getElementById('close-login-btn').onclick = () => loginModal.classList.add('hidden');
  document.getElementById('confirm-login-btn').onclick = performLogin;
  document.getElementById('steam-login-action').onclick = performLogin;

  document.getElementById('open-settings-btn').onclick = () => settingsModal.classList.remove('hidden');
  document.getElementById('close-settings-btn').onclick = () => settingsModal.classList.add('hidden');
  document.getElementById('save-settings-btn').onclick = () => settingsModal.classList.add('hidden');

  document.getElementById('open-deposit-btn').onclick = () => {
    userBalance += 100;
    updateBalanceUI();
  };
}

function performLogin() {
  const usernameInput = document.getElementById('login-username-input').value.trim();
  currentUser = usernameInput.length > 0 ? usernameInput : "SteamUser_" + Math.floor(Math.random() * 8999 + 1000);
  isLoggedIn = true;

  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('open-login-btn').classList.add('hidden');
  document.getElementById('user-profile-box').classList.remove('hidden');
  document.getElementById('user-balance-box').classList.remove('hidden');
  document.getElementById('open-deposit-btn').classList.remove('hidden');

  document.getElementById('display-username').innerText = currentUser;
  document.getElementById('p1-display-name').innerText = currentUser;
}

// NYELVVÁLTÁS
window.switchLanguage = function(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`lang-${lang}`).classList.add('active');

  const t = TRANSLATIONS[lang];
  document.getElementById('txt-live-drops').innerText = t.liveDrops;
  document.getElementById('txt-nav-cases').innerText = t.navCases;
  document.getElementById('txt-nav-battles').innerText = t.navBattles;
  document.getElementById('txt-nav-upgrader').innerText = t.navUpgrader;
  document.getElementById('txt-balance-label').innerText = t.balanceLabel;
  document.getElementById('txt-login-btn').innerText = t.loginBtn;
  document.getElementById('txt-cases-title').innerText = t.casesTitle;
  document.getElementById('txt-cases-sub').innerText = t.casesSub;
  document.getElementById('txt-multi-open').innerText = t.multiOpen;
  document.getElementById('txt-case-contents').innerText = t.caseContents;
  document.getElementById('txt-inventory-title').innerText = t.inventoryTitle;
  document.getElementById('txt-empty-inv').innerText = t.emptyInv;
  document.getElementById('txt-battles-sub').innerText = t.battlesSub;
  document.getElementById('txt-open-battles').innerText = t.openBattles;
  document.getElementById('txt-borrow-desc').innerText = t.borrowDesc;
  document.getElementById('txt-upgrader-sub').innerText = t.upgraderSub;
  document.getElementById('txt-your-stake').innerText = t.yourStake;
  document.getElementById('txt-chance-label').innerText = t.chanceLabel;
  document.getElementById('txt-target-skin').innerText = t.targetSkin;
};

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-tab');
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));

      e.currentTarget.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
      if (target === 'upgrader') updateUpgraderInventory();
    });
  });
}

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
  updateMultiSpinners();

  const grid = document.getElementById('case-items-grid');
  grid.innerHTML = SKIN_DATABASE.map(item => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img}" alt="${item.name}">
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
};

function updateMultiSpinners() {
  const wrapper = document.getElementById('spinners-wrapper');
  wrapper.innerHTML = '';
  for (let i = 0; i < multiOpenCount; i++) {
    wrapper.innerHTML += `
      <div class="roulette-container">
        <div class="roulette-pointer"></div>
        <div class="roulette-track" id="spinner-track-${i}"></div>
      </div>
    `;
  }
  const totalCost = activeCase ? activeCase.price * multiOpenCount : 0;
  document.getElementById('open-case-btn').innerText = `LÁDA NYITÁSA ($${totalCost.toFixed(2)})`;
}

function closeCaseView() {
  document.getElementById('case-opener-view').classList.add('hidden');
  document.getElementById('case-catalog-view').classList.remove('hidden');
}

function handleOpenCase() {
  if (!isLoggedIn) return document.getElementById('login-modal').classList.remove('hidden');
  if (isSpinning) return;
  const totalCost = activeCase.price * multiOpenCount;
  if (userBalance < totalCost) return alert("Nincs elég egyenleged!");

  userBalance -= totalCost;
  updateBalanceUI();
  isSpinning = true;

  const isFast = document.getElementById('fast-spin-toggle').checked;
  const spinTime = isFast ? 1.2 : 4.0;

  for (let s = 0; s < multiOpenCount; s++) {
    const wonItem = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
    const track = document.getElementById(`spinner-track-${s}`);
    
    track.style.transition = 'none';
    track.style.transform = 'translateX(0px)';

    let spinnerList = [];
    for (let i = 0; i < 60; i++) {
      if (i === 55) spinnerList.push(wonItem);
      else spinnerList.push(SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)]);
    }

    track.innerHTML = spinnerList.map(item => `
      <div class="item-card ${getRarityClass(item.price)}">
        <img src="${item.img}" alt="${item.name}">
        <div class="name">${item.name}</div>
        <div class="price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');

    const cardWidth = 170 + 12;
    const targetX = -(55 * cardWidth) + (document.querySelector('.roulette-container').offsetWidth / 2) - (cardWidth / 2);

    setTimeout(() => {
      track.style.transition = `transform ${spinTime}s cubic-bezier(0.1, 0.8, 0.1, 1)`;
      track.style.transform = `translateX(${targetX}px)`;
    }, 50);

    userInventory.push(wonItem);
  }

  playClickSound();

  setTimeout(() => {
    isSpinning = false;
    playWinSound();
    renderInventory();
  }, spinTime * 1000 + 200);
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  if (userInventory.length === 0) return;
  grid.innerHTML = userInventory.map(item => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img}" alt="${item.name}">
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
}

// BATTLES
function renderBattlesLobby() {
  const list = document.getElementById('battles-list');
  list.innerHTML = `
    <div class="battle-card-item">
      <div class="battle-info-left">
        <div class="battle-case-preview">
          <img src="${OFFICIAL_CASES[1].img}" class="battle-case-img">
        </div>
        <div class="battle-details">
          <h4>Neon Battle 1v1</h4>
          <p>1 Láda • Standard mód</p>
        </div>
      </div>
      <div class="battle-actions-right">
        <div class="battle-cost-tag">$12.00</div>
        <button class="btn btn-primary btn-sm" onclick="startBattleRoom(12.00)">CSATLAKOZÁS</button>
      </div>
    </div>

    <div class="battle-card-item">
      <div class="battle-info-left">
        <div class="battle-case-preview">
          <img src="${OFFICIAL_CASES[2].img}" class="battle-case-img">
          <img src="${OFFICIAL_CASES[3].img}" class="battle-case-img">
        </div>
        <div class="battle-details">
          <h4>High Roller Covert Battle</h4>
          <p>2 Láda • Crazy Mód</p>
        </div>
      </div>
      <div class="battle-actions-right">
        <div class="battle-cost-tag">$285.00</div>
        <button class="btn btn-primary btn-sm" onclick="startBattleRoom(285.00)">CSATLAKOZÁS</button>
      </div>
    </div>
  `;
}

function renderSponsorFeed() {
  const feed = document.getElementById('sponsor-feed-list');
  feed.innerHTML = `
    <div class="sponsor-card">
      <div>
        <div class="p-name">GamerPro99</div>
        <div class="p-need">Kért összeg: $24.00</div>
      </div>
      <button class="btn btn-sm btn-ghost" onclick="alert('Szponzoráltad a csatát (80%)!')">FINANSZÍROZÁS ($19.20)</button>
    </div>
  `;
}

function createNewBattle() { startBattleRoom(12.00); }

function startBattleRoom(cost) {
  if (!isLoggedIn) return document.getElementById('login-modal').classList.remove('hidden');
  if (userBalance < cost) return alert("Nincs elég egyenleged a belépőhöz!");
  userBalance -= cost;
  updateBalanceUI();

  activeBattle = { cost };
  document.getElementById('arena-pot-val').innerText = `$${(cost * 2).toFixed(2)}`;
  document.getElementById('battle-arena').classList.remove('hidden');
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

  setTimeout(() => {
    if (p1Item.price >= p2Item.price) {
      const winVal = p1Item.price + p2Item.price;
      userBalance += winVal;
      updateBalanceUI();
      playWinSound();
      alert(`NYERTÉL! Összesen $${winVal.toFixed(2)} értékű dropot vittél el.`);
    } else {
      alert("A BOT NYERTE A BATTLET!");
    }
  }, 400);
}

function closeBattleArena() { document.getElementById('battle-arena').classList.add('hidden'); }

// UPGRADER
let selectedTargetSkin = SKIN_DATABASE[2];

function initUpgrader() {
  document.getElementById('upgrade-input-val').addEventListener('input', updateUpgradeChance);

  const targetList = document.getElementById('upgrade-target-list');
  targetList.innerHTML = SKIN_DATABASE.map(item => `
    <div class="mini-item-card" onclick="selectUpgradeTarget(${item.id})">
      <img src="${item.img}">
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');

  document.getElementById('start-upgrade-btn').addEventListener('click', runUpgrade);
  selectUpgradeTarget(selectedTargetSkin.id);
}

function selectUpgradeTarget(id) {
  selectedTargetSkin = SKIN_DATABASE.find(s => s.id === id);
  document.getElementById('target-skin-img').src = selectedTargetSkin.img;
  document.getElementById('target-skin-name').innerText = selectedTargetSkin.name;
  document.getElementById('target-skin-price').innerText = `$${selectedTargetSkin.price.toFixed(2)}`;
  updateUpgradeChance();
}

function updateUpgradeChance() {
  const inputVal = parseFloat(document.getElementById('upgrade-input-val').value) || 1;
  let chance = (inputVal / selectedTargetSkin.price) * 100;
  if (chance > 95) chance = 95;
  if (chance < 1) chance = 1;

  document.getElementById('upgrade-chance-num').innerText = `${chance.toFixed(2)}%`;

  const slice = document.getElementById('upgrade-chance-slice');
  const circumference = 502.4;
  const offset = circumference - (circumference * (chance / 100));
  slice.style.strokeDashoffset = offset;
}

function updateUpgraderInventory() {
  const invList = document.getElementById('upgrade-inv-list');
  invList.innerHTML = userInventory.map(item => `
    <div class="mini-item-card" onclick="document.getElementById('upgrade-input-val').value=${item.price}; updateUpgradeChance();">
      <img src="${item.img}">
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
}

function runUpgrade() {
  if (!isLoggedIn) return document.getElementById('login-modal').classList.remove('hidden');
  if (isSpinning) return;
  const inputVal = parseFloat(document.getElementById('upgrade-input-val').value) || 0;
  if (userBalance < inputVal) return alert("Nincs elég egyenleged a téthez!");

  userBalance -= inputVal;
  updateBalanceUI();
  isSpinning = true;

  let chance = (inputVal / selectedTargetSkin.price) * 100;
  if (chance > 95) chance = 95;
  if (chance < 1) chance = 1;

  const needle = document.getElementById('upgrade-needle');
  const win = Math.random() * 100 <= chance;
  const targetDeg = win ? (chance / 100) * 360 * 0.8 : 360 * 0.9;

  needle.style.transition = 'transform 3s cubic-bezier(0.15, 0.9, 0.2, 1)';
  needle.style.transform = `translate(-50%, 0) rotate(${1440 + targetDeg}deg)`;

  playClickSound();

  setTimeout(() => {
    isSpinning = false;
    needle.style.transition = 'none';
    needle.style.transform = `translate(-50%, 0) rotate(0deg)`;

    if (win) {
      playWinSound();
      userInventory.push(selectedTargetSkin);
      renderInventory();
      alert(`SIKERES UPGRADE! Nyertél egy ${selectedTargetSkin.name} skint!`);
    } else {
      alert("AZ UPGRADE SIKERTELEN VOLT!");
    }
  }, 3200);
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
