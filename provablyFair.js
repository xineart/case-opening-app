const crypto = require('crypto');

class ProvablyFairEngine {
  /**
   * Új biztonságos Server Seed generálása
   */
  static generateServerSeed() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Új Client Seed generálása
   */
  static generateClientSeed() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * SHA-256 Hash készítése a Server Seed-ből (ezt látja a felhasználó a pörgetés előtt)
   */
  static hashServerSeed(serverSeed) {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  /**
   * HMAC-SHA256 számítás 0 és 99,999 közötti Roll szám generálásához
   */
  static calculateRoll(serverSeed, clientSeed, nonce) {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest('hex');

    // Első 8 karakter átalakítása 16-os számrendszerből 10-esbe
    const subHash = hash.substring(0, 8);
    const decimalValue = parseInt(subHash, 16);

    // Modulo 100,000 a pontos esélyeloszláshoz
    return decimalValue % 100000;
  }

  /**
   * Nyeremény kiválasztása súlyozott valószínűség alapján
   */
  static determineOutcome(items, roll) {
    let cumulativeWeight = 0;
    for (const item of items) {
      cumulativeWeight += item.weight;
      if (roll < cumulativeWeight) {
        return item;
      }
    }
    return items[0]; // Fallback
  }
}

module.exports = ProvablyFairEngine;
