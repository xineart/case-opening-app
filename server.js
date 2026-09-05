const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <title>PACKDROP - CS2 Case & Battle</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background: #0b0e14; color: #fff; text-align: center; padding-bottom: 50px; }
        
        /* Navigáció */
        header { background: #151a23; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222936; }
        .logo { font-size: 24px; font-weight: 900; color: #ffb400; letter-spacing: 2px; }
        .balance-card { background: #1f2733; padding: 10px 20px; border-radius: 8px; border: 1px solid #00e5ff; font-weight: bold; }

        /* Fő tartalom */
        .container { max-width: 1100px; margin: 30px auto; padding: 0 20px; }
        h2 { margin-bottom: 20px; color: #8a96a3; text-transform: uppercase; font-size: 16px; letter-spacing: 1px; }

        /* Ládák rácsa */
        .cases-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .case-card { background: #151a23; border: 1px solid #222936; border-radius: 12px; padding: 20px; transition: 0.3s; position: relative; }
        .case-card:hover { border-color: #ffb400; transform: translateY(-5px); box-shadow: 0 10px 20px rgba(255, 180, 0, 0.15); }
        .case-icon { width: 100px; height: 100px; margin: 10px auto; display: block; }
        .case-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .case-price { color: #00e5ff; font-weight: bold; font-size: 16px; margin-bottom: 15px; }
        
        /* Gombok */
        .btn { background: #ffb400; color: #000; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; width: 100%; }
        .btn:hover { background: #ffd000; }
        .btn-battle { background: #e02424; color: #fff; margin-top: 8px; }
        .btn-battle:hover { background: #ff3838; }

        /* Pörgető (Case Spinner) */
        .spinner-wrapper { position: relative; width: 100%; max-width: 700px; height: 160px; margin: 20px auto; overflow: hidden; border: 3px solid #ffb400; border-radius: 12px; background: #07090d; display: none; }
        .pointer { position: absolute; left: 50%; top: 0; bottom: 0; width: 4px; background: #00e5ff; z-index: 10; transform: translateX(-50%); box-shadow: 0 0 10px #00e5ff; }
        .spinner-track { display: flex; position: absolute; left: 0; top: 10px; transition: transform 5s cubic-bezier(0.15, 0.9, 0.2, 1); }
        .item-card { width: 120px; height: 135px; background: #151a23; margin: 0 5px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; border-bottom: 4px solid #fff; padding: 5px; }

        /* Battle Aréna */
        .battle-arena { display: none; background: #151a23; padding: 25px; border-radius: 12px; border: 1px solid #222936; margin-top: 30px; }
        .battle-players { display: flex; justify-content: space-around; margin-top: 20px; }
        .player-box { background: #0b0e14; padding: 20px; border-radius: 10px; width: 45%; border: 1px solid #222936; }
      </style>
    </head>
    <body>

      <header>
        <div class="logo">PACKDROP</div>
        <div class="balance-card">Egyenleg: <span id="balance" style="color: #00e5ff;">$100.00</span></div>
      </header>

      <div class="container">
        
        <!-- PÖRGETŐ SZEKCIÓ -->
        <div id="spinner-container" class="spinner-wrapper">
          <div class="pointer"></div>
          <div id="spinner-track" class="spinner-track"></div>
        </div>
        <h3 id="win-message" style="margin-bottom: 30px; color: #ffb400; min-height: 28px;"></h3>

        <!-- BATTLE ARÉNA -->
        <div id="battle-arena" class="battle-arena">
          <h2>⚔️ CASE BATTLE (Játékos vs Bot)</h2>
          <div class="battle-players">
            <div class="player-box">
              <h3>TE</h3>
              <p id="p1-score" style="font-size: 20px; color: #00e5ff; margin-top: 10px;">$0.00</p>
              <div id="p1-container">
                <p id="p1-drop" style="margin-top: 10px; font-size: 14px; color: #aaa;">Várakozás...</p>
              </div>
            </div>
            <div style="font-size: 30px; align-self: center; font-weight: bold; color: #e02424;">VS</div>
            <div class="player-box">
              <h3>BOT ALEX</h3>
              <p id="p2-score" style="font-size: 20px; color: #00e5ff; margin-top: 10px;">$0.00</p>
              <div id="p2-container">
                <p id="p2-drop" style="margin-top: 10px; font-size: 14px; color: #aaa;">Várakozás...</p>
              </div>
            </div>
          </div>
        </div>

        <h2>Válassz ládát</h2>
        
        <div class="cases-grid">
          
          <!-- LÁDA 1 -->
          <div class="case-card">
            <div class="case-title">Weapon Case #1</div>
            <div class="case-price">$5.00</div>
            <div class="case-icon">
              <svg viewBox="0 0 100 100" width="100" height="100">
                <rect x="10" y="25" width="80" height="55" rx="5" fill="#ff9900" stroke="#fff" stroke-width="2"/>
                <rect x="10" y="25" width="80" height="15" fill="#e68a00"/>
                <rect x="42" y="45" width="16" height="12" fill="#111" rx="2"/>
              </svg>
            </div>
            <button class="btn" onclick="startSpin(5.00)">NYITÁS</button>
            <button class="btn btn-battle" onclick="startBattle(5.00)">BATTLE ($5)</button>
          </div>

          <!-- LÁDA 2 -->
          <div class="case-card">
            <div class="case-title">Glove Case</div>
            <div class="case-price">$25.00</div>
            <div class="case-icon">
              <svg viewBox="0 0 100 100" width="100" height="100">
                <rect x="10" y="25" width="80" height="55" rx="5" fill="#d32ce6" stroke="#fff" stroke-width="2"/>
                <rect x="10" y="25" width="80" height="15" fill="#a020b0"/>
                <rect x="42" y="45" width="16" height="12" fill="#111" rx="2"/>
              </svg>
            </div>
            <button class="btn" onclick="startSpin(25.00)">NYITÁS</button>
            <button class="btn btn-battle" onclick="startBattle(25.00)">BATTLE ($25)</button>
          </div>

          <!-- LÁDA 3 -->
          <div class="case-card">
            <div class="case-title">Kilowatt Case</div>
            <div class="case-price">$50.00</div>
            <div class="case-icon">
              <svg viewBox="0 0 100 100" width="100" height="100">
                <rect x="10" y="25" width="80" height="55" rx="5" fill="#eb4b4b" stroke="#fff" stroke-width="2"/>
                <rect x="10" y="25" width="80" height="15" fill="#b02020"/>
                <rect x="42" y="45" width="16" height="12" fill="#111" rx="2"/>
              </svg>
            </div>
            <button class="btn" onclick="startSpin(50.00)">NYITÁS</button>
            <button class="btn btn-battle" onclick="startBattle(50.00)">BATTLE ($50)</button>
          </div>

        </div>
      </div>

      <script>
        let balance = 100.00;
        
        // VEKTOROS GRAFIKÁJÚ SKINEK (0% KÜLSŐ FÜGGŐSÉG, 100% BETÖLTÉS)
        const items = [
          { 
            name: "P250 | Sand Dune", 
            price: 0.10, 
            color: "#b0c3d9", 
            svg: '<svg viewBox="0 0 60 40" width="60" height="40"><path d="M10,25 L25,10 L50,10 L50,20 L35,20 L30,30 Z" fill="#b0c3d9" stroke="#fff" stroke-width="1"/></svg>' 
          },
          { 
            name: "AK-47 | Redline", 
            price: 15.00, 
            color: "#e4ae39", 
            svg: '<svg viewBox="0 0 60 40" width="60" height="40"><path d="M5,20 L15,15 L55,12 L50,22 L20,22 Z" fill="#111" stroke="#e02424" stroke-width="2"/></svg>' 
          },
          { 
            name: "USP-S | Kill Confirmed", 
            price: 50.00, 
            color: "#d32ce6", 
            svg: '<svg viewBox="0 0 60 40" width="60" height="40"><path d="M5,22 L15,12 L55,12 L50,20 L20,20 Z" fill="#d32ce6" stroke="#fff" stroke-width="1"/></svg>' 
          },
          { 
            name: "M4A4 | Howl", 
            price: 1200.00, 
            color: "#eb4b4b", 
            svg: '<svg viewBox="0 0 60 40" width="60" height="40"><path d="M5,20 L15,10 L55,10 L52,22 L20,22 Z" fill="#eb4b4b" stroke="#ffb400" stroke-width="1.5"/></svg>' 
          },
          { 
            name: "Karambit | Fade", 
            price: 1800.00, 
            color: "#eb4b4b", 
            svg: '<svg viewBox="0 0 60 40" width="60" height="40"><path d="M15,30 Q35,5 50,25 Q30,20 15,30 Z" fill="url(#fadeGrad)" stroke="#fff" stroke-width="1"/><defs><linearGradient id="fadeGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#d32ce6;" /><stop offset="100%" style="stop-color:#ffb400;" /></linearGradient></defs></svg>' 
          }
        ];

        function startSpin(cost) {
          if (balance < cost) return alert("Nincs elég egyenleged!");
          balance -= cost;
          updateBalance();

          const spinner = document.getElementById('spinner-container');
          const track = document.getElementById('spinner-track');
          const winMsg = document.getElementById('win-message');
          document.getElementById('battle-arena').style.display = 'none';

          spinner.style.display = 'block';
          winMsg.innerText = "Sorsolás folyamatban...";
          track.style.transition = 'none';
          track.style.transform = 'translateX(0)';

          track.innerHTML = '';
          let winningItem = items[Math.floor(Math.random() * items.length)];
          
          for (let i = 0; i < 50; i++) {
            let randItem = (i === 40) ? winningItem : items[Math.floor(Math.random() * items.length)];
            let div = document.createElement('div');
            div.className = 'item-card';
            div.style.borderColor = randItem.color;
            div.innerHTML = randItem.svg + '<b style="color:'+randItem.color+'; margin-top:5px;">' + randItem.name + '</b>$' + randItem.price;
            track.appendChild(div);
          }

          setTimeout(() => {
            track.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.2, 1)';
            track.style.transform = 'translateX(-4900px)';
          }, 50);

          setTimeout(() => {
            balance += winningItem.price;
            updateBalance();
            winMsg.innerHTML = 'Kinyitottad: <span style="color:' + winningItem.color + '">' + winningItem.name + '</span> ($' + winningItem.price + ')';
          }, 5200);
        }

        function startBattle(cost) {
          if (balance < cost) return alert("Nincs elég egyenleged a Battle-re!");
          balance -= cost;
          updateBalance();

          document.getElementById('spinner-container').style.display = 'none';
          const arena = document.getElementById('battle-arena');
          arena.style.display = 'block';

          document.getElementById('p1-container').innerHTML = '<p id="p1-drop">Nyitás...</p>';
          document.getElementById('p2-container').innerHTML = '<p id="p2-drop">Nyitás...</p>';

          setTimeout(() => {
            let p1Item = items[Math.floor(Math.random() * items.length)];
            let p2Item = items[Math.floor(Math.random() * items.length)];

            document.getElementById('p1-score').innerText = '$' + p1Item.price;
            document.getElementById('p1-container').innerHTML = p1Item.svg + '<br><b style="color:' + p1Item.color + '">' + p1Item.name + '</b>';

            document.getElementById('p2-score').innerText = '$' + p2Item.price;
            document.getElementById('p2-container').innerHTML = p2Item.svg + '<br><b style="color:' + p2Item.color + '">' + p2Item.name + '</b>';

            setTimeout(() => {
              if (p1Item.price >= p2Item.price) {
                let winAmount = p1Item.price + p2Item.price;
                balance += winAmount;
                alert("NYERTÉL A BATTLE-BEN! Nyereményed: $" + winAmount);
              } else {
                alert("A Bot nyert! Próbáld újra.");
              }
              updateBalance();
            }, 500);
          }, 1500);
        }

        function updateBalance() {
          document.getElementById('balance').innerText = '$' + balance.toFixed(2);
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
