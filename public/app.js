// --- GLOBÁLIS STATE ---
let userBalance = 100.00;
let isSpinning = false;
let activeCase = null;
let activeBattle = null;
let userInventory = [];
let multiOpenCount = 1;

// GARANTÁLT SVG GENERÁTOR CS2 GRAFIKÁKHOZ (Ha a külső kép nem tölt be)
function getCS2Graphic(type, name, color = "#00ff88") {
  if (type === 'case') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" class="cs2-svg">
      <defs>
        <linearGradient id="g-${color.replace('#','')}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}" />
          <stop offset="100%" stop-color="#0b0e17" />
        </linearGradient>
      </defs>
      <rect x="10" y="20" width="80" height="50" rx="6" fill="url(#g-${color.replace('#','')})" stroke="${color}" stroke-width="2"/>
      <path d="M10 32 L90 32 M50 20 L50 70" stroke="#ffffff" stroke-width="2" opacity="0.4"/>
      <rect x="42" y="40" width="16" height="12" rx="2" fill="#ffffff" opacity="0.8"/>
    </svg>`;
  } else {
    // Weapon Silhouette
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70" class="cs2-svg">
      <path d="M10 45 L35 40 L45 25 L80 22 L110 35 L105 45 L85 42 L65 55 L30 50 Z" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M45 25 L55 42" stroke="${color}" stroke-width="2"/>
      <circle cx="95" cy="38" r="3" fill="${color}"/>
      <text x="60" y="66" font-size="8" font-family="Chakra Petch" fill="#ffffff" text-anchor="middle" opacity="0.7">${name}</text>
    </svg>`;
  }
}

// AUDIO CONTEXT (WEB AUDIO API)
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playClickSound() {
  if (!document.getElementById('sfx-toggle').checked) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playWinSound() {
  if (!document.getElementById('sfx-toggle').checked) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// RESZECSKÉK & KONFETTI CANVAS
let particles = [];
function triggerConfetti() {
  const canvas = document.getElementById('effects-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 4,
      color: ['#00ff88', '#00e5ff', '#8b5cf6', '#eab308', '#ff0055'][Math.floor(Math.random() * 5)],
      size: Math.random() * 8 + 4,
      life: 100
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life--;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      if (p.life <= 0) particles.splice(idx, 1);
    });
    if (particles.length > 0) requestAnimationFrame(animate);
  }
  animate();
}

// ADATBÁZIS
const SKIN_DATABASE = [
  { id: 1, name: "P250 | Sand Dune", price: 0.50, color: "#3b82f6" },
  { id: 2, name: "Glock-18 | Water Elemental", price: 8.50, color: "#8b5cf6" },
  { id: 3, name: "AK-47 | Redline", price: 22.00, color: "#d946ef" },
  { id: 4, name: "M4A4 | Neo-Noir", price: 35.00, color: "#f43f5e" },
  { id: 5, name: "AWP | Asiimov", price: 110.00, color: "#f43f5e" },
  { id: 6, name: "AK-47 | Vulcan", price: 280.00, color: "#f43f5e" },
  { id: 7, name: "★ Karambit | Fade", price: 2400.00, color: "#eab308" }
];

const OFFICIAL_CASES = [
  { id: 'terb-starter', name: 'TerB Starter Case', price: 2.50, color: "#3b82f6" },
  { id: 'terb-neon', name: 'TerB Neon Case', price: 12.00, color: "#8b5cf6" },
  { id: 'terb-classified', name: 'TerB Covert Collection', price: 35.00, color: "#d946ef" },
  { id: 'terb-knife', name: 'TerB Knife & Gold Box', price: 250.00, color: "#eab308" }
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
      ${getCS2Graphic('case', c.name, c.color)}
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
      ${getCS2Graphic('weapon', item.name, item.color)}
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
        ${getCS2Graphic('weapon', item.name, item.color)}
        <div class="name">${item.name}</div>
        <div class="price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');

    const cardWidth = 160 + 12;
    const targetX = -(55 * cardWidth) + (document.querySelector('.roulette-container').offsetWidth / 2) - (cardWidth / 2);

    setTimeout(() => {
      track.style.transition = `transform ${spinTime}s cubic-bezier(0.1, 0.8, 0.1, 1)`;
      track.style.transform = `translateX(${targetX}px)`;
    }, 50);

    userInventory.push(wonItem);
    if (wonItem.price >= 100) triggerConfetti();
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
      ${getCS2Graphic('weapon', item.name, item.color)}
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
}

// UPGRADER LOGIKA
let selectedTargetSkin = SKIN_DATABASE[2];

function initUpgrader() {
  const inputVal = document.getElementById('upgrade-input-val');
  inputVal.addEventListener('input', updateUpgradeChance);

  const targetList = document.getElementById('upgrade-target-list');
  targetList.innerHTML = SKIN_DATABASE.map(item => `
    <div class="mini-item-card" onclick="selectUpgradeTarget(${item.id})">
      ${getCS2Graphic('weapon', item.name, item.color)}
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');

  document.getElementById('start-upgrade-btn').addEventListener('click', runUpgrade);
  selectUpgradeTarget(selectedTargetSkin.id);
}

function selectUpgradeTarget(id) {
  selectedTargetSkin = SKIN_DATABASE.find(s => s.id === id);
  document.getElementById('target-skin-img-container').innerHTML = getCS2Graphic('weapon', selectedTargetSkin.name, selectedTargetSkin.color);
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
      ${getCS2Graphic('weapon', item.name, item.color)}
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
}

function runUpgrade() {
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
  const fullRots = 1440;

  needle.style.transition = 'transform 3s cubic-bezier(0.15, 0.9, 0.2, 1)';
  needle.style.transform = `translate(-50%, 0) rotate(${fullRots + targetDeg}deg)`;

  playClickSound();

  setTimeout(() => {
    isSpinning = false;
    needle.style.transition = 'none';
    needle.style.transform = `translate(-50%, 0) rotate(0deg)`;

    if (win) {
      playWinSound();
      triggerConfetti();
      userInventory.push(selectedTargetSkin);
      renderInventory();
      alert(`SIKERES UPGRADE! Nyertél egy ${selectedTargetSkin.name} skint!`);
    } else {
      alert("AZ UPGRADE SIKERTELEN VOLT!");
    }
  }, 3200);
}

// CASE BATTLES LOGIKA
function renderBattlesLobby() {
  const list = document.getElementById('battles-list');
  list.innerHTML = `
    <div class="battle-room-item">
      <div>
        <strong style="font-size:1.1rem;">⚔️ TerBDrop 1v1 Battle</strong>
        <p style="color:var(--text-muted); font-size:0.85rem;">1x TerB Neon Case ($12.00)</p>
      </div>
      <button class="btn btn-primary" onclick="startBattleRoom(12, false)">BELÉPÉS ($12)</button>
    </div>
  `;
}

function renderSponsorFeed() {
  const feed = document.getElementById('sponsor-feed-list');
  feed.innerHTML = `
    <div class="sponsor-item">
      <div>Player_TerB99 (80/20 Borrow)</div>
      <button class="btn btn-sm btn-primary" onclick="alert('Sikeres szponzorálás!')">FINANSZÍROZÁS ($80)</button>
    </div>
  `;
}

function createNewBattle() { startBattleRoom(12, false); }

function startBattleRoom(cost, isBorrow) {
  if (userBalance < cost) return alert("Nincs elég egyenleged!");
  userBalance -= cost;
  updateBalanceUI();

  activeBattle = { cost, isBorrow };
  document.getElementById('battle-arena').classList.remove('hidden');
}

function runBattleSpin() {
  if (!activeBattle) return;
  const p1Item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
  const p2Item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];

  document.getElementById('p1-drop-slot').innerHTML = `<div class="item-card ${getRarityClass(p1Item.price)}">${getCS2Graphic('weapon', p1Item.name, p1Item.color)}</div>`;
  document.getElementById('p2-drop-slot').innerHTML = `<div class="item-card ${getRarityClass(p2Item.price)}">${getCS2Graphic('weapon', p2Item.name, p2Item.color)}</div>`;

  setTimeout(() => {
    if (p1Item.price >= p2Item.price) {
      userBalance += p1Item.price + p2Item.price;
      updateBalanceUI();
      playWinSound();
      alert("NYERTÉL!");
    } else {
      alert("VESZTETTÉL!");
    }
  }, 300);
}

function closeBattleArena() { document.getElementById('battle-arena').classList.add('hidden'); }

function updateBalanceUI() {
  const streamer = document.getElementById('streamer-mode-toggle').checked;
  document.getElementById('user-balance').innerText = streamer ? '***' : `$${userBalance.toFixed(2)}`;
}

function initLiveFeed() {
  const track = document.getElementById('live-feed-track');
  setInterval(() => {
    const item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
    const el = document.createElement('div');
    el.className = `feed-item ${getRarityClass(item.price)}`;
    el.innerHTML = `${getCS2Graphic('weapon', item.name, item.color)}<span>${item.name} ($${item.price.toFixed(2)})</span>`;
    track.prepend(el);
    if (track.children.length > 7) track.removeChild(track.lastChild);
  }, 3500);
}

function setupModalEvents() {
  const authModal = document.getElementById('auth-modal');
  const settingsModal = document.getElementById('settings-modal');

  document.getElementById('open-auth-btn').onclick = () => authModal.classList.remove('hidden');
  document.getElementById('close-auth-btn').onclick = () => authModal.classList.add('hidden');

  document.getElementById('open-settings-btn').onclick = () => settingsModal.classList.remove('hidden');
  document.getElementById('close-settings-btn').onclick = () => settingsModal.classList.add('hidden');
  document.getElementById('save-settings-btn').onclick = () => {
    settingsModal.classList.add('hidden');
    updateBalanceUI();
  };

  document.getElementById('open-deposit-btn').onclick = () => {
    userBalance += 100;
    updateBalanceUI();
  };
}
