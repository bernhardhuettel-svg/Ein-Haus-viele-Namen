(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FirestoreAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function requireId(value) {
    if (typeof value !== "string" || !value || value.includes("/")) throw new Error("Dokumentkennung fehlt oder ist ungültig.");
    return value;
  }
  function toTimestamp(iso, Timestamp) {
    if (!Timestamp || typeof Timestamp.fromDate !== "function") throw new Error("Timestamp-Umwandlung fehlt.");
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) throw new Error("Ungültiger Zeitpunkt.");
    return Timestamp.fromDate(date);
  }
  function ledgerDocument(entry, Timestamp, auditId) {
    const consent = entry && entry.consent ? entry.consent : null;
    if (!entry || !entry.transactionId) throw new Error("Private Buchung fehlt.");
    return {
      auditId: requireId(auditId), transactionId: entry.transactionId,
      amountCents: entry.confirmedAmountCents, effectiveCents: entry.effectiveAmountCents,
      refundCents: entry.refundedAmountCents,
      paidAt: toTimestamp(`${entry.paymentDate}T00:00:00.000Z`, Timestamp),
      supportCode: entry.assignmentCode || "", payerLabel: entry.privateMatchName || "",
      policyVersion: entry.purposeVersion, note: entry.internalNote || "",
      publicApproved: entry.publicApproved,
      publicName: consent && consent.status === "granted" ? consent.displayName : "",
      publicMessage: consent && consent.status === "granted" ? consent.wish : "",
      consentEvidence: consent && consent.status === "granted" ? `documented:${consent.textVersion}` : "",
      consentGrantedAt: consent && consent.recordedAt ? toTimestamp(consent.recordedAt, Timestamp) : null,
      consentRevokedAt: consent && consent.revokedAt ? toTimestamp(consent.revokedAt, Timestamp) : null,
      revision: entry.revision, createdAt: toTimestamp(entry.createdAt, Timestamp),
      updatedAt: toTimestamp(entry.updatedAt, Timestamp)
    };
  }
  function publicSupporterDocument(entry, Timestamp) {
    if (!entry || !entry.publicApproved || !entry.consent || entry.consent.status !== "granted") {
      throw new Error("Keine aktive dokumentierte Namensfreigabe.");
    }
    return { name: entry.consent.displayName, message: entry.consent.wish, publicApproved: true, updatedAt: toTimestamp(entry.updatedAt, Timestamp) };
  }
  function auditDocument(record, uid, Timestamp) {
    return {
      ledgerId: requireId(record.ledgerId), action: record.action,
      beforeEffectiveCents: record.beforeEffectiveCents, afterEffectiveCents: record.afterEffectiveCents,
      beforePublicApproved: record.beforePublicApproved, afterPublicApproved: record.afterPublicApproved,
      revision: record.revision, changedAt: toTimestamp(record.at, Timestamp), changedBy: uid
    };
  }
  function websiteDocument(state, Timestamp, lastAudit) {
    const entries = Object.values(state.ledgerEntries || {});
    return {
      confirmedCents: entries.reduce((sum, entry) => sum + entry.effectiveAmountCents, 0),
      confirmedSupporters: entries.filter((entry) => entry.effectiveAmountCents > 0).length,
      lastLedgerId: requireId(lastAudit.ledgerId), lastAuditId: requireId(lastAudit.id),
      updatedAt: toTimestamp(lastAudit.at, Timestamp)
    };
  }
  function assertPublicShape(value) {
    if (Object.keys(value).sort().join("|") !== "message|name|publicApproved|updatedAt") {
      throw new Error("Öffentlicher Adapter enthält unerlaubte Felder.");
    }
    return true;
  }
  function operatorStateDocuments(state, uid, Timestamp) {
    if (!state || !state.ledgerEntries || !Array.isArray(state.ledgerAudit) || !state.ledgerAudit.length) {
      throw new Error("Betreiberzustand enthält keine vollständige Testbuchung.");
    }
    const privateDocuments = { ledgerEntries: {}, ledgerAudit: {} };
    const publicDocuments = { publicSupporters: {}, publicProject: {} };
    for (const [id, entry] of Object.entries(state.ledgerEntries)) {
      privateDocuments.ledgerEntries[id] = ledgerDocument(entry, Timestamp, entry.auditId);
      if (entry.publicApproved) {
        const publicEntry = publicSupporterDocument(entry, Timestamp);
        assertPublicShape(publicEntry);
        publicDocuments.publicSupporters[id] = publicEntry;
      }
    }
    for (const item of state.ledgerAudit) privateDocuments.ledgerAudit[item.id] = auditDocument(item, uid, Timestamp);
    const lastAudit = state.ledgerAudit[state.ledgerAudit.length - 1];
    publicDocuments.publicProject.website = websiteDocument(state, Timestamp, lastAudit);
    return { privateDocuments, publicDocuments };
  }
  return { ledgerDocument, publicSupporterDocument, auditDocument, websiteDocument, assertPublicShape, operatorStateDocuments };
});
