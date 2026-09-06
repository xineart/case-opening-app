// TerBDrop Adatbázis - Garantált képmegjelenítéssel
const SKIN_DATABASE = [
  { id: 1, name: "P250 | Sand Dune", rarity: "consumer", price: 0.50, img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_p250_cu_sand_light.png" },
  { id: 2, name: "Glock-18 | Water Elemental", rarity: "restricted", price: 8.50, img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_glock_cu_glock_water_elemental_light.png" },
  { id: 3, name: "AK-47 | Redline", rarity: "classified", price: 22.00, img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_ak47_cu_ak47_cobra_light.png" },
  { id: 4, name: "M4A4 | Neo-Noir", rarity: "covert", price: 35.00, img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_m4a1_cu_m4a4_neo_noir_light.png" },
  { id: 5, name: "AWP | Asiimov", rarity: "covert", price: 110.00, img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_awp_cu_awp_asimov_light.png" },
  { id: 6, name: "AK-47 | Vulcan", rarity: "covert", price: 280.00, img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_ak47_cu_ak47_vulcan_light.png" },
  { id: 7, name: "★ Karambit | Fade", rarity: "extraordinary", price: 2400.00, img: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/default_generated/weapon_knife_karambit_an_progression_light.png" }
];

const TERB_CASES = [
  { id: 'terb-starter', name: 'TerB Starter Case', price: 2.50, color: '#4b69ff' },
  { id: 'terb-classified', name: 'TerB Covert Case', price: 25.00, color: '#eb4b4b' },
  { id: 'terb-knife', name: 'TerB Knife & Gold Case', price: 150.00, color: '#ffd700' }
];

// SVG Tartalék Generáló (Ha a külső image URL nem tölt be)
function getFallbackImage(name, color = '#ff0055') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
    <rect width="100%" height="100%" fill="#12141d"/>
    <path d="M30 90 L80 50 L130 80 L170 40" stroke="${color}" stroke-width="4" fill="none"/>
    <circle cx="170" cy="40" r="6" fill="${color}"/>
    <text x="50%" y="85%" font-family="Arial" font-weight="bold" font-size="12" fill="#ffffff" text-anchor="middle">${name}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Renderelő függvény hibaággal
function renderSkinCard(skin) {
  return `
    <div class="skin-card rarity-${skin.rarity}">
      <div class="skin-img-wrapper">
        <img src="${skin.img}" alt="${skin.name}" onerror="this.onerror=null; this.src='${getFallbackImage(skin.name)}';" />
      </div>
      <div class="skin-title">${skin.name}</div>
      <div class="skin-price">$${skin.price.toFixed(2)}</div>
    </div>
  `;
}
