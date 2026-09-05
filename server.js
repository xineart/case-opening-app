const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CS2 Case Opening</title>
      <style>
        body { background: #121212; color: white; font-family: sans-serif; text-align: center; padding-top: 50px; }
        .box { border: 2px solid #ff9900; padding: 20px; display: inline-block; border-radius: 10px; margin-bottom: 20px; }
        button { background: #ff9900; border: none; padding: 15px 30px; font-size: 18px; font-weight: bold; cursor: pointer; border-radius: 5px; color: black; }
        button:hover { background: #e68a00; }
        #result { margin-top: 20px; font-size: 24px; font-weight: bold; color: #00ffcc; }
      </style>
    </head>
    <body>
      <h1>CS2 LÁDANYITÁS</h1>
      <div class="box">
        <h2>Weapon Case #1</h2>
        <p>Ár: $2.50</p>
        <button onclick="openCase()">LÁDA NYITÁSA</button>
      </div>
      <div id="result"></div>

      <script>
        function openCase() {
          const items = [
            { name: "AK-47 | Redline (Fix: $15)", color: "#e4ae39" },
            { name: "M4A4 | Howl (Fix: $1500)", color: "#eb4b4b" },
            { name: "USP-S | Kill Confirmed (Fix: $40)", color: "#d32ce6" },
            { name: "P250 | Sand Dune (Fix: $0.10)", color: "#b0c3d9" }
          ];
          const drop = items[Math.floor(Math.random() * items.length)];
          document.getElementById('result').innerHTML = 'Nyereményed: <span style="color:' + drop.color + '">' + drop.name + '</span>';
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
