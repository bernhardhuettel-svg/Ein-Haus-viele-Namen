(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BetreiberKern = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 2;

  function fail(message) {
    const error = new Error(message);
    error.name = "Validierungsfehler";
    throw error;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) fail("Ungültiger Zeitpunkt.");
    return date.toISOString();
  }

  function normalizeTransactionId(value) {
    const id = String(value || "").trim().replace(/\s+/g, "-").toUpperCase();
    if (id.length < 4 || id.length > 120) fail("Die Transaktions-ID muss 4 bis 120 Zeichen lang sein.");
    if (id.includes("/")) fail("Die Transaktions-ID darf keinen Schrägstrich enthalten.");
    return id;
  }

  function ledgerId(value) {
    const id = String(value || "").trim().toLowerCase();
    if (!/^ent_[0-9a-f]{24}$/.test(id)) fail("Die interne Buchungskennung ist ungültig.");
    return id;
  }

  function createLedgerId(idFactory) {
    if (typeof idFactory === "function") return ledgerId(idFactory());
    const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : null;
    if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
      fail("Sichere Zufallskennungen sind in dieser Umgebung nicht verfügbar.");
    }
    const bytes = new Uint8Array(12);
    cryptoApi.getRandomValues(bytes);
    return ledgerId("ent_" + Array.from(bytes, (item) => item.toString(16).padStart(2, "0")).join(""));
  }

  function auditId(entryId, revision) {
    return `evt_${ledgerId(entryId).slice(4)}_${revision}`;
  }

  function positiveCents(value, label) {
    const amount = Number(value);
    if (!Number.isSafeInteger(amount) || amount <= 0) fail(`${label} muss eine positive Cent-Ganzzahl sein.`);
    return amount;
  }

  function text(value, max, label, required) {
    const result = String(value || "").trim();
    if (required && !result) fail(`${label} fehlt.`);
    if (result.length > max) fail(`${label} darf höchstens ${max} Zeichen lang sein.`);
    return result;
  }

  function validDate(value) {
    const date = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
      fail("Das Zahlungsdatum muss ein gültiges Kalenderdatum im Format JJJJ-MM-TT sein.");
    }
    return date;
  }

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      localPrototype: true,
      ledgerEntries: {},
      transactionIndex: {},
      publicSupporters: {},
      ledgerAudit: []
    };
  }

  function entryFor(state, ledgerIdValue) {
    const id = ledgerId(ledgerIdValue);
    const entry = state.ledgerEntries[id];
    if (!entry) fail("Zu dieser internen Kennung gibt es keine Buchung.");
    return { id, entry };
  }

  function audit(state, before, entry, action, at, deltaCents, detail) {
    const id = auditId(entry.ledgerId, entry.revision);
    entry.auditId = id;
    state.ledgerAudit.push({
      id,
      ledgerId: entry.ledgerId,
      transactionId: entry.transactionId,
      action,
      at,
      revision: entry.revision,
      beforeEffectiveCents: before ? before.effectiveAmountCents : 0,
      afterEffectiveCents: entry.effectiveAmountCents,
      beforePublicApproved: before ? before.publicApproved : false,
      afterPublicApproved: entry.publicApproved,
      deltaCents,
      detail
    });
  }

  function registerPayment(source, input, atValue, options) {
    const state = clone(source);
    if (!input || input.manualConfirmed !== true) fail("Der tatsächliche Zahlungseingang muss manuell bestätigt sein.");
    const transactionId = normalizeTransactionId(input.transactionId);
    if (state.transactionIndex[transactionId]) fail("Diese Transaktions-ID ist bereits erfasst.");
    const entryId = createLedgerId(options && options.ledgerIdFactory);
    if (state.ledgerEntries[entryId]) fail("Die erzeugte interne Buchungskennung ist bereits vergeben.");
    const confirmedAmountCents = positiveCents(input.confirmedAmountCents, "Der bestätigte Betrag");
    const at = nowIso(atValue);
    const entry = {
      ledgerId: entryId,
      transactionId,
      confirmedAmountCents,
      refundedAmountCents: 0,
      effectiveAmountCents: confirmedAmountCents,
      paymentDate: validDate(input.paymentDate),
      privateMatchName: text(input.privateMatchName, 120, "Privater Zuordnungsname", false),
      assignmentCode: text(input.assignmentCode, 80, "Zuordnungscode", false),
      purposeVersion: text(input.purposeVersion || "Hausprojekt-Fassung-2026-10-07", 80, "Zweckfassung", true),
      internalNote: text(input.internalNote, 500, "Interne Notiz", false),
      publicApproved: false,
      consent: null,
      revision: 1,
      auditId: "",
      createdAt: at,
      updatedAt: at
    };
    state.ledgerEntries[entryId] = entry;
    state.transactionIndex[transactionId] = entryId;
    audit(state, null, entry, "PAYMENT_CONFIRMED", at, confirmedAmountCents, "Eingang manuell bestätigt");
    validateState(state);
    return state;
  }

  function recordRefund(source, ledgerIdValue, refundCentsValue, noteValue, atValue) {
    const state = clone(source);
    const { id, entry } = entryFor(state, ledgerIdValue);
    const before = clone(entry);
    const refundCents = positiveCents(refundCentsValue, "Der Rückzahlungsbetrag");
    if (refundCents > entry.effectiveAmountCents) fail("Die Rückzahlung darf den noch wirksamen Betrag nicht überschreiten.");
    const at = nowIso(atValue);
    entry.refundedAmountCents += refundCents;
    entry.effectiveAmountCents -= refundCents;
    entry.revision += 1;
    entry.updatedAt = at;
    audit(state, before, entry, "REFUND_RECORDED", at, -refundCents, text(noteValue, 300, "Korrekturvermerk", true));
    state.ledgerEntries[id] = entry;
    validateState(state);
    return state;
  }

  function grantConsent(source, ledgerIdValue, input, atValue) {
    const state = clone(source);
    const { id, entry } = entryFor(state, ledgerIdValue);
    const before = clone(entry);
    if (!input || input.documented !== true) fail("Die Namensfreigabe muss ausdrücklich dokumentiert sein.");
    const displayName = text(input.displayName, 40, "Anzeigename", true);
    const wish = text(input.wish, 140, "Wunsch", false);
    const textVersion = text(input.textVersion || "Namensfreigabe-2026-10-07", 80, "Einwilligungsfassung", true);
    const at = nowIso(atValue);
    entry.publicApproved = true;
    entry.consent = { status: "granted", displayName, wish, textVersion, recordedAt: at, revokedAt: null };
    entry.revision += 1;
    entry.updatedAt = at;
    state.publicSupporters[id] = { displayName, wish, publicApproved: true, updatedAt: at };
    audit(state, before, entry, "PUBLIC_CONSENT_GRANTED", at, 0, `Einwilligungsfassung ${textVersion}`);
    state.ledgerEntries[id] = entry;
    validateState(state);
    return state;
  }

  function revokeConsent(source, ledgerIdValue, noteValue, atValue) {
    const state = clone(source);
    const { id, entry } = entryFor(state, ledgerIdValue);
    const before = clone(entry);
    if (!entry.publicApproved || !entry.consent || entry.consent.status !== "granted") {
      fail("Für diese Buchung besteht keine aktive Namensfreigabe.");
    }
    const at = nowIso(atValue);
    entry.publicApproved = false;
    entry.consent.status = "revoked";
    entry.consent.revokedAt = at;
    entry.revision += 1;
    entry.updatedAt = at;
    delete state.publicSupporters[id];
    audit(state, before, entry, "PUBLIC_CONSENT_REVOKED", at, 0, text(noteValue || "Widerruf dokumentiert", 300, "Widerrufsvermerk", true));
    state.ledgerEntries[id] = entry;
    validateState(state);
    return state;
  }

  function publicSnapshot(state, atValue) {
    validateState(state);
    const entries = Object.values(state.ledgerEntries);
    const confirmedTotalCents = entries.reduce((sum, entry) => sum + entry.effectiveAmountCents, 0);
    const supporters = Object.keys(state.publicSupporters).sort().map((id) => clone(state.publicSupporters[id]));
    return {
      website: {
        confirmedTotalCents,
        confirmedPaymentCount: entries.filter((entry) => entry.effectiveAmountCents > 0).length,
        updatedAt: nowIso(atValue)
      },
      publicSupporters: supporters
    };
  }

  function validateState(state) {
    if (!state || state.schemaVersion !== SCHEMA_VERSION || state.localPrototype !== true) fail("Unbekanntes Datenformat.");
    if (!state.ledgerEntries || !state.transactionIndex || !state.publicSupporters || !Array.isArray(state.ledgerAudit)) fail("Datenstruktur unvollständig.");
    const allowedPublic = ["displayName", "publicApproved", "updatedAt", "wish"].sort().join("|");
    for (const [id, entry] of Object.entries(state.ledgerEntries)) {
      if (id !== ledgerId(entry.ledgerId)) fail("Buchungsschlüssel und interne Kennung stimmen nicht überein.");
      const transactionId = normalizeTransactionId(entry.transactionId);
      if (state.transactionIndex[transactionId] !== id) fail("Private Zahlungsreferenz und Buchung sind nicht eindeutig zugeordnet.");
      if (id === transactionId.toLowerCase()) fail("Die Zahlungsreferenz darf nicht als Buchungskennung verwendet werden.");
      if (entry.auditId !== auditId(id, entry.revision)) fail("Die Buchung verweist nicht auf den aktuellen Auditdatensatz.");
      if (!Number.isInteger(entry.confirmedAmountCents) || !Number.isInteger(entry.refundedAmountCents)) fail("Beträge müssen Cent-Ganzzahlen sein.");
      if (entry.refundedAmountCents < 0 || entry.effectiveAmountCents !== entry.confirmedAmountCents - entry.refundedAmountCents || entry.effectiveAmountCents < 0) fail("Betragsbilanz ist ungültig.");
      const publicEntry = state.publicSupporters[id];
      if (entry.publicApproved) {
        if (!entry.consent || entry.consent.status !== "granted" || !publicEntry) fail("Öffentlicher Eintrag ohne aktive Einwilligung.");
        if (publicEntry.displayName !== entry.consent.displayName || publicEntry.wish !== entry.consent.wish) fail("Öffentliche Kopie stimmt nicht mit der Einwilligung überein.");
      } else if (publicEntry) {
        fail("Öffentlicher Eintrag trotz fehlender Einwilligung.");
      }
    }
    const indexed = Object.entries(state.transactionIndex);
    if (indexed.length !== Object.keys(state.ledgerEntries).length) fail("Der private Zahlungsreferenz-Index ist unvollständig.");
    for (const [transactionId, id] of indexed) {
      if (normalizeTransactionId(transactionId) !== transactionId || !state.ledgerEntries[ledgerId(id)]) {
        fail("Der private Zahlungsreferenz-Index ist ungültig.");
      }
    }
    for (const item of state.ledgerAudit) {
      if (item.id !== auditId(item.ledgerId, item.revision)) fail("Auditkennung ist ungültig.");
      if (!state.ledgerEntries[item.ledgerId]) fail("Auditdatensatz verweist auf eine unbekannte Buchung.");
    }
    for (const publicEntry of Object.values(state.publicSupporters)) {
      if (Object.keys(publicEntry).sort().join("|") !== allowedPublic) fail("Öffentliche Kopie enthält nicht erlaubte Felder.");
      if (publicEntry.publicApproved !== true) fail("Öffentlicher Eintrag ist nicht freigegeben.");
    }
    return true;
  }

  function demoState() {
    let state = emptyState();
    state = registerPayment(state, {
      transactionId: "DEMO-TXN-001", confirmedAmountCents: 2500, paymentDate: "2026-10-07",
      privateMatchName: "Testperson A", assignmentCode: "DEMO-A1", internalNote: "Erfundener Testfall", manualConfirmed: true
    }, "2026-10-07T18:00:00.000Z", { ledgerIdFactory: () => "ent_000000000000000000000001" });
    state = grantConsent(state, "ent_000000000000000000000001", {
      documented: true, displayName: "Testname A", wish: "Viel Erfolg!", textVersion: "TEST-FREIGABE-1"
    }, "2026-10-07T18:01:00.000Z");
    state = registerPayment(state, {
      transactionId: "DEMO-TXN-002", confirmedAmountCents: 1000, paymentDate: "2026-10-07",
      privateMatchName: "Testperson B", assignmentCode: "", internalNote: "Bleibt öffentlich anonym", manualConfirmed: true
    }, "2026-10-07T18:02:00.000Z", { ledgerIdFactory: () => "ent_000000000000000000000002" });
    return state;
  }

  return {
    SCHEMA_VERSION,
    emptyState,
    demoState,
    normalizeTransactionId,
    createLedgerId,
    registerPayment,
    recordRefund,
    grantConsent,
    revokeConsent,
    publicSnapshot,
    validateState
  };
});
