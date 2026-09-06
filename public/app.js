/* ==========================================================================
   LUXDROP CORE ENGINE v4.2 - FULL SYSTEM ARCHITECTURE (FIXED IMAGE ENGINE)
   Contains: Dynamic Image Fallbacks, Sound FX Engine, CS2 Odds, Multi-Track Spinner,
   Provably Fair System, Inventory, Live Feed, UI Event Listeners.
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. CONFIGURATION & CONSTANTS
// --------------------------------------------------------------------------
const LUX_CONFIG = {
    VERSION: "4.2.0-PROD-IMGFIX",
    CURRENCY_SYMBOL: "$",
    SPIN_DURATION_NORMAL: 4.5, // sec
    SPIN_DURATION_FAST: 1.2,   // sec
    CARD_WIDTH: 180,           // px
    CARD_GAP: 12,              // px
    WIN_INDEX: 68,             // Megállási pozíció a generált tömbben
    MAX_LIVE_DROPS: 20,
    STORAGE_KEY_BALANCE: "lux_user_balance",
    STORAGE_KEY_INVENTORY: "lux_user_inventory",
    STORAGE_KEY_STATS: "lux_user_stats"
};

// CS2 Esélyek (%)
const CS2_ODDS = {
    MILSPEC: 79.92,
    RESTRICTED: 15.98,
    CLASSIFIED: 3.20,
    COVERT: 0.64,
    SPECIAL: 0.26
};

// Dinamikus tartalék kép generáló (Canvas alapon), ha a helyi kép hiányozna (404)
function createFallbackImage(title, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    // Háttér gradiens
    const grad = ctx.createLinearGradient(0, 0, 200, 200);
    grad.addColorStop(0, "#1a1c23");
    grad.addColorStop(1, "#0d0e12");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 200, 200);

    // Belső fény / körvonal
    ctx.strokeStyle = color || "#4b69ff";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 180, 180);

    // Szöveg kirajzolás
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Szöveg tördelése
    const parts = title.split(" | ");
    if (parts.length > 1) {
        ctx.fillText(parts[0], 100, 85);
        ctx.fillStyle = color || "#4b69ff";
        ctx.fillText(parts[1], 100, 115);
    } else {
        ctx.fillText(title, 100, 100);
    }

    return canvas.toDataURL("image/png");
}

// Global Image Error Handler (HTML onerror-ből hívható)
window.handleImgError = function(imgElement, title, color) {
    imgElement.onerror = null; // Végtelen ciklus megakadályozása
    imgElement.src = createFallbackImage(title, color);
};

// --------------------------------------------------------------------------
// 2. AUDIO ENGINE (Web Audio API)
// --------------------------------------------------------------------------
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTick() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    }

    playWin(rarity) {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        let freq = 523.25; // C5
        if (rarity === 'covert') freq = 880;
        if (rarity === 'special') freq = 1046.50;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }
}

const Audio = new SoundEngine();

// --------------------------------------------------------------------------
// 3. MASTER ITEM DATABASE
// --------------------------------------------------------------------------
const COLOR_TO_RARITY = {
    "#4b69ff": "milspec",
    "#8847ff": "restricted",
    "#d32ce6": "classified",
    "#eb4b4b": "covert",
    "#ffd700": "special"
};

const SKIN_DATABASE = [
  { id: 1, name: "P250 | Sand Dune", price: 0.50, color: "#4b69ff", img: "./images/p250_sanddune.png" },
  { id: 2, name: "Glock-18 | Water Elemental", price: 8.50, color: "#8847ff", img: "./images/glock_waterelemental.png" },
  { id: 3, name: "AK-47 | Redline", price: 22.00, color: "#d32ce6", img: "./images/ak47_redline.png" },
  { id: 4, name: "M4A4 | Neo-Noir", price: 35.00, color: "#eb4b4b", img: "./images/m4a4_neonoir.png" },
  { id: 5, name: "AWP | Asiimov", price: 110.00, color: "#eb4b4b", img: "./images/awp_asiimov.png" },
  { id: 6, name: "AK-47 | Vulcan", price: 280.00, color: "#eb4b4b", img: "./images/ak47_vulcan.png" },
  { id: 7, name: "★ Karambit | Fade", price: 2400.00, color: "#ffd700", img: "./images/karambit_fade.png" }
];

const MASTER_ITEMS = SKIN_DATABASE.map(item => ({
    id: `item_${item.id}`,
    name: item.name,
    price: item.price,
    color: item.color,
    rarity: COLOR_TO_RARITY[item.color] || "milspec",
    img: item.img
}));

const OFFICIAL_CASES = [
  { id: 'terb-starter', name: 'Starter Case', price: 2.50, color: "#4b69ff", img: "./images/case_starter.png" },
  { id: 'terb-neon', name: 'Neon Collection', price: 12.00, color: "#8847ff", img: "./images/case_neon.png" },
  { id: 'terb-classified', name: 'Covert Case', price: 35.00, color: "#d32ce6", img: "./images/case_covert.png" },
  { id: 'terb-knife', name: 'Knife & Gold Box', price: 250.00, color: "#ffd700", img: "./images/case_knife.png" }
];

const CASE_COLLECTION = OFFICIAL_CASES.map(c => ({
    id: c.id,
    name: c.name,
    price: c.price,
    color: c.color,
    category: "Official",
    img: c.img
}));

// --------------------------------------------------------------------------
// 4. PROVABLY FAIR
// --------------------------------------------------------------------------
class ProvablyFair {
    constructor() {
        this.serverSeed = this.generateRandomHex(64);
        this.clientSeed = "LUXDROP_COMMUNITY_2026";
        this.nonce = 0;
    }

    generateRandomHex(length) {
        const chars = "abcdef0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    getRoll() {
        this.nonce++;
        const combined = `${this.serverSeed}-${this.clientSeed}-${this.nonce}`;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash |= 0;
        }
        const absHash = Math.abs(hash);
        return (absHash % 1000000) / 10000;
    }
}

const PF = new ProvablyFair();

// --------------------------------------------------------------------------
// 5. STATE MANAGEMENT
// --------------------------------------------------------------------------
class AppState {
    constructor() {
        this.balance = parseFloat(localStorage.getItem(LUX_CONFIG.STORAGE_KEY_BALANCE)) || 500.00;
        this.inventory = JSON.parse(localStorage.getItem(LUX_CONFIG.STORAGE_KEY_INVENTORY)) || [];
        this.stats = JSON.parse(localStorage.getItem(LUX_CONFIG.STORAGE_KEY_STATS)) || {
            casesOpened: 0,
            totalSpent: 0,
            bestDropValue: 0
        };
        this.activeCase = CASE_COLLECTION[0];
        this.multiCount = 1;
        this.isSpinning = false;
        this.fastMode = false;
    }

    save() {
        localStorage.setItem(LUX_CONFIG.STORAGE_KEY_BALANCE, this.balance.toFixed(2));
        localStorage.setItem(LUX_CONFIG.STORAGE_KEY_INVENTORY, JSON.stringify(this.inventory));
        localStorage.setItem(LUX_CONFIG.STORAGE_KEY_STATS, JSON.stringify(this.stats));
        this.updateUI();
    }

    updateUI() {
        const balEl = document.getElementById("user-balance");
        if (balEl) balEl.innerText = `${LUX_CONFIG.CURRENCY_SYMBOL}${this.balance.toFixed(2)}`;
        
        const statsCaseEl = document.getElementById("stat-cases");
        if (statsCaseEl) statsCaseEl.innerText = this.stats.casesOpened;
    }

    addBalance(amount) {
        this.balance += amount;
        this.save();
    }

    deductBalance(amount) {
        if (this.balance >= amount) {
            this.balance -= amount;
            this.save();
            return true;
        }
        return false;
    }
}

const State = new AppState();

// --------------------------------------------------------------------------
// 6. ROULETTE & SPIN ENGINE
// --------------------------------------------------------------------------
class SpinEngine {
    constructor() {
        this.tracksContainer = null;
    }

    init() {
        this.tracksContainer = document.getElementById("tracks-wrapper");
        this.renderTracks();
    }

    setMulti(count) {
        if (State.isSpinning) return;
        State.multiCount = count;
        this.renderTracks();
        this.updateOpenButton();
    }

    updateOpenButton() {
        const btn = document.getElementById("btn-open-main");
        if (btn) {
            const cost = (State.activeCase.price * State.multiCount).toFixed(2);
            btn.innerText = `NYITÁS (${LUX_CONFIG.CURRENCY_SYMBOL}${cost})`;
        }
    }

    renderTracks() {
        if (!this.tracksContainer) return;
        let html = "";
        for (let i = 0; i < State.multiCount; i++) {
            html += `
                <div class="roulette-viewport" id="viewport-${i}">
                    <div class="roulette-pointer"></div>
                    <div class="roulette-track" id="track-${i}"></div>
                </div>
            `;
        }
        this.tracksContainer.innerHTML = html;

        for (let i = 0; i < State.multiCount; i++) {
            const track = document.getElementById(`track-${i}`);
            if (track) {
                track.innerHTML = this.generateTrackHTML(this.getRandomItems(10));
            }
        }
    }

    getRandomItems(count) {
        const items = [];
        for (let i = 0; i < count; i++) {
            items.push(this.rollSkinByOdds());
        }
        return items;
    }

    rollSkinByOdds() {
        if (State.activeCase.id === "knife_god") {
            const knives = MASTER_ITEMS.filter(x => x.rarity === "special");
            return knives[Math.floor(Math.random() * knives.length)];
        }

        const roll = PF.getRoll();
        let cumulative = 0;
        let selectedRarity = "milspec";

        for (const [rarity, chance] of Object.entries(CS2_ODDS)) {
            cumulative += chance;
            if (roll <= cumulative) {
                selectedRarity = rarity.toLowerCase();
                break;
            }
        }

        const pool = MASTER_ITEMS.filter(x => x.rarity === selectedRarity);
        if (pool.length === 0) return MASTER_ITEMS[0];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    generateTrackHTML(itemList) {
        return itemList.map(item => `
            <div class="item-card ${item.rarity}" data-id="${item.id}">
                <img src="${item.img}" alt="${item.name}" loading="lazy" onerror="handleImgError(this, '${item.name.replace(/'/g, "\\'")}', '${item.color}')">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${LUX_CONFIG.CURRENCY_SYMBOL}${item.price.toFixed(2)}</div>
            </div>
        `).join("");
    }

    spin() {
        if (State.isSpinning) return;

        const totalCost = State.activeCase.price * State.multiCount;
        if (!State.deductBalance(totalCost)) {
            alert("Nincs elég egyenleged a nyitáshoz!");
            return;
        }

        State.isSpinning = true;
        State.stats.casesOpened += State.multiCount;
        State.stats.totalSpent += totalCost;

        const duration = State.fastMode ? LUX_CONFIG.SPIN_DURATION_FAST : LUX_CONFIG.SPIN_DURATION_NORMAL;
        const totalStep = LUX_CONFIG.CARD_WIDTH + LUX_CONFIG.CARD_GAP;

        let winners = [];

        for (let s = 0; s < State.multiCount; s++) {
            const track = document.getElementById(`track-${s}`);
            const viewport = document.getElementById(`viewport-${s}`);
            if (!track || !viewport) continue;

            const winnerItem = this.rollSkinByOdds();
            winners.push(winnerItem);

            const trackItems = [];
            for (let i = 0; i < 80; i++) {
                if (i === LUX_CONFIG.WIN_INDEX) {
                    trackItems.push(winnerItem);
                } else {
                    trackItems.push(this.rollSkinByOdds());
                }
            }

            track.style.transition = "none";
            track.style.transform = "translateX(0px)";
            track.innerHTML = this.generateTrackHTML(trackItems);

            const viewportWidth = viewport.clientWidth;
            const randomOffsetWithinCard = Math.floor(Math.random() * (LUX_CONFIG.CARD_WIDTH - 20)) - (LUX_CONFIG.CARD_WIDTH / 2 - 10);
            const targetX = -(LUX_CONFIG.WIN_INDEX * totalStep) + (viewportWidth / 2) - (LUX_CONFIG.CARD_WIDTH / 2) + randomOffsetWithinCard;

            void track.offsetWidth;

            track.style.transition = `transform ${duration}s cubic-bezier(0.08, 0.8, 0.1, 1)`;
            track.style.transform = `translateX(${targetX}px)`;

            if (!State.fastMode) {
                let currentStep = 0;
                const interval = setInterval(() => {
                    currentStep++;
                    Audio.playTick();
                    if (currentStep > 25) clearInterval(interval);
                }, (duration * 1000) / 30);
            }
        }

        setTimeout(() => {
            State.isSpinning = false;
            winners.forEach(win => {
                State.inventory.push(win);
                LiveFeed.addDrop(win);
                Audio.playWin(win.rarity);

                if (win.price > State.stats.bestDropValue) {
                    State.stats.bestDropValue = win.price;
                }
            });

            State.save();
            InventoryUI.render();
        }, duration * 1000 + 100);
    }
}

const Spinner = new SpinEngine();

// --------------------------------------------------------------------------
// 7. LIVE DROPS FEED SYSTEM
// --------------------------------------------------------------------------
class LiveFeedSystem {
    constructor() {
        this.container = null;
    }

    init() {
        this.container = document.getElementById("live-feed-track");
        if (!this.container) return;

        for (let i = 0; i < 12; i++) {
            const randomSkin = MASTER_ITEMS[Math.floor(Math.random() * MASTER_ITEMS.length)];
            this.addDrop(randomSkin, false);
        }
    }

    addDrop(item, animate = true) {
        if (!this.container) return;

        const card = document.createElement("div");
        card.className = `feed-card ${item.rarity}`;
        card.innerHTML = `
            <img src="${item.img}" alt="${item.name}" onerror="handleImgError(this, '${item.name.replace(/'/g, "\\'")}', '${item.color}')">
            <div class="info">
                <span class="name">${item.name}</span>
                <span class="price">${LUX_CONFIG.CURRENCY_SYMBOL}${item.price.toFixed(2)}</span>
            </div>
        `;

        if (animate) {
            card.style.animation = "fadeIn 0.4s ease-out";
        }

        this.container.insertBefore(card, this.container.firstChild);

        if (this.container.children.length > LUX_CONFIG.MAX_LIVE_DROPS) {
            this.container.removeChild(this.container.lastChild);
        }
    }
}

const LiveFeed = new LiveFeedSystem();

// --------------------------------------------------------------------------
// 8. INVENTORY & ITEM MANAGEMENT
// --------------------------------------------------------------------------
class InventorySystem {
    constructor() {
        this.grid = null;
    }

    init() {
        this.grid = document.getElementById("inventory-grid");
        this.render();
    }

    render() {
        if (!this.grid) return;

        if (State.inventory.length === 0) {
            this.grid.innerHTML = `<div class="empty-msg">A leltárad jelenleg üres. Nyiss ládákat!</div>`;
            return;
        }

        this.grid.innerHTML = State.inventory.map((item, index) => `
            <div class="inventory-card ${item.rarity}">
                <img src="${item.img}" alt="${item.name}" onerror="handleImgError(this, '${item.name.replace(/'/g, "\\'")}', '${item.color}')">
                <div class="name">${item.name}</div>
                <div class="price">${LUX_CONFIG.CURRENCY_SYMBOL}${item.price.toFixed(2)}</div>
                <button class="btn-sell" onclick="InventoryUI.sellItem(${index})">ELADÁS</button>
            </div>
        `).join("");
    }

    sellItem(index) {
        if (index < 0 || index >= State.inventory.length) return;
        const item = State.inventory[index];
        State.balance += item.price;
        State.inventory.splice(index, 1);
        State.save();
        this.render();
    }

    sellAll() {
        if (State.inventory.length === 0) return;
        const total = State.inventory.reduce((acc, curr) => acc + curr.price, 0);
        State.balance += total;
        State.inventory = [];
        State.save();
        this.render();
    }
}

const InventoryUI = new InventorySystem();

// --------------------------------------------------------------------------
// 9. CASE SELECTOR & UI EVENT LISTENERS
// --------------------------------------------------------------------------
function initUIEvents() {
    const casesGrid = document.getElementById("cases-grid");
    if (casesGrid) {
        casesGrid.innerHTML = CASE_COLLECTION.map(c => `
            <div class="case-card" onclick="selectCase('${c.id}')">
                <img src="${c.img}" alt="${c.name}" onerror="handleImgError(this, '${c.name.replace(/'/g, "\\'")}', '${c.color}')">
                <h3>${c.name}</h3>
                <div class="price">${LUX_CONFIG.CURRENCY_SYMBOL}${c.price.toFixed(2)}</div>
            </div>
        `).join("");
    }

    const fastToggle = document.getElementById("fast-spin-toggle");
    if (fastToggle) {
        fastToggle.addEventListener("change", (e) => {
            State.fastMode = e.target.checked;
        });
    }

    const navBtns = document.querySelectorAll(".nav-btn");
    navBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            const tabTarget = this.getAttribute("data-tab");
            if (!tabTarget) return;

            document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

            this.classList.add("active");
            const targetEl = document.getElementById(`tab-${tabTarget}`);
            if (targetEl) targetEl.classList.add("active");
        });
    });
}

function selectCase(caseId) {
    const found = CASE_COLLECTION.find(x => x.id === caseId);
    if (!found) return;

    State.activeCase = found;
    const titleEl = document.getElementById("active-case-title");
    if (titleEl) titleEl.innerText = found.name;

    Spinner.updateOpenButton();
    renderCasePreview();
}

function renderCasePreview() {
    const previewGrid = document.getElementById("case-preview-grid");
    if (!previewGrid) return;

    let itemsToDisplay = MASTER_ITEMS;
    if (State.activeCase.id === "knife_god") {
        itemsToDisplay = MASTER_ITEMS.filter(x => x.rarity === "special");
    }

    previewGrid.innerHTML = itemsToDisplay.map(item => `
        <div class="item-card ${item.rarity}">
            <img src="${item.img}" alt="${item.name}" onerror="handleImgError(this, '${item.name.replace(/'/g, "\\'")}', '${item.color}')">
            <div class="item-name">${item.name}</div>
            <div class="item-price">${LUX_CONFIG.CURRENCY_SYMBOL}${item.price.toFixed(2)}</div>
        </div>
    `).join("");
}

// Globális függvények
window.setMultiOpen = (count) => Spinner.setMulti(count);
window.handleOpenCase = () => Spinner.spin();
window.selectCase = (id) => selectCase(id);
window.addFunds = () => {
    State.addBalance(100.00);
};

// --------------------------------------------------------------------------
// 10. SYSTEM INITIALIZATION
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log(`[LUXDROP ENGINE] Initializing Version ${LUX_CONFIG.VERSION}`);
    State.updateUI();
    Spinner.init();
    LiveFeed.init();
    InventoryUI.init();
    initUIEvents();
    renderCasePreview();
});
