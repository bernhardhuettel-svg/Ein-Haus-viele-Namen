(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports ? require("./betreiber-kern.js") : root.BetreiberKern
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FirestoreReferenceGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (K) {
  "use strict";

  async function paymentRefId(transactionId, cryptoApi) {
    const normalized = K.normalizeTransactionId(transactionId);
    const webCrypto = cryptoApi || (typeof globalThis !== "undefined" ? globalThis.crypto : null);
    if (!webCrypto || !webCrypto.subtle || typeof webCrypto.subtle.digest !== "function") {
      throw new Error("Web Crypto für den privaten Referenzschutz fehlt.");
    }
    const bytes = new TextEncoder().encode(normalized);
    const digest = await webCrypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    return `pay_${hex}`;
  }

  function toTimestamp(iso, Timestamp) {
    if (!Timestamp || typeof Timestamp.fromDate !== "function") throw new Error("Firebase Timestamp fehlt.");
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) throw new Error("Ungültiger Zeitpunkt für Referenzschutz.");
    return Timestamp.fromDate(date);
  }

  function referenceDocument(entry, Timestamp) {
    if (!entry || !entry.ledgerId || !entry.transactionId) throw new Error("Private Buchung für Referenzschutz fehlt.");
    return { ledgerId: entry.ledgerId, createdAt: toTimestamp(entry.createdAt, Timestamp) };
  }

  return { paymentRefId, referenceDocument };
});
