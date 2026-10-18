(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports ? require("./betreiber-kern.js") : root.BetreiberKern,
    typeof module === "object" && module.exports ? require("./firestore-adapter-browser.js") : root.FirestoreAdapter,
    typeof module === "object" && module.exports ? require("./firestore-reference-guard-browser.js") : root.FirestoreReferenceGuard
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FirestoreBatchGenerator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (K, A, R) {
  "use strict";

  const allowedActions = new Set(["PAYMENT_CONFIRMED", "REFUND_RECORDED", "PUBLIC_CONSENT_GRANTED", "PUBLIC_CONSENT_REVOKED"]);
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

  function changedLedgerId(before, after) {
    const beforeEntries = before.ledgerEntries || {};
    const afterEntries = after.ledgerEntries || {};
    const ids = new Set([...Object.keys(beforeEntries), ...Object.keys(afterEntries)]);
    const changed = [...ids].filter((id) => !same(beforeEntries[id], afterEntries[id]));
    if (changed.length !== 1) throw new Error("Der Batch muss genau eine geänderte Buchung enthalten.");
    if (!afterEntries[changed[0]]) throw new Error("Buchungen dürfen nicht gelöscht werden.");
    return changed[0];
  }

  function newAudit(before, after, ledgerId) {
    const known = new Set((before.ledgerAudit || []).map((item) => item.id));
    const added = (after.ledgerAudit || []).filter((item) => !known.has(item.id));
    if (added.length !== 1) throw new Error("Der Batch muss genau einen neuen Auditdatensatz enthalten.");
    const item = added[0];
    const entry = after.ledgerEntries[ledgerId];
    if (item.id !== entry.auditId || item.ledgerId !== ledgerId || item.revision !== entry.revision) {
      throw new Error("Auditdatensatz und Buchung sind nicht eindeutig verknüpft.");
    }
    if (!allowedActions.has(item.action)) throw new Error("Unbekannte Bedienaktion.");
    return item;
  }

  function assertTransition(beforeEntry, afterEntry, action) {
    if (action === "PAYMENT_CONFIRMED" && beforeEntry) throw new Error("Erstbuchung darf keine bestehende Buchung ersetzen.");
    if (action !== "PAYMENT_CONFIRMED" && !beforeEntry) throw new Error("Die Bedienaktion benötigt eine bestehende Buchung.");
    if (action === "REFUND_RECORDED" && beforeEntry.publicApproved !== afterEntry.publicApproved) throw new Error("Eine Rückzahlung darf die Namensfreigabe nicht verändern.");
    if (action === "PUBLIC_CONSENT_GRANTED" && (beforeEntry.publicApproved || !afterEntry.publicApproved)) throw new Error("Ungültiger Übergang für die Namensfreigabe.");
    if (action === "PUBLIC_CONSENT_REVOKED" && (!beforeEntry.publicApproved || afterEntry.publicApproved)) throw new Error("Ungültiger Übergang für den Widerruf.");
  }

  function buildBatchCommands({ beforeState, afterState, ownerUid, Timestamp }) {
    const before = beforeState || K.emptyState();
    if (beforeState) K.validateState(before);
    K.validateState(afterState);
    if (typeof ownerUid !== "string" || !ownerUid.trim()) throw new Error("Betreiberkennung fehlt.");

    const ledgerId = changedLedgerId(before, afterState);
    const beforeEntry = before.ledgerEntries[ledgerId] || null;
    const afterEntry = afterState.ledgerEntries[ledgerId];
    const audit = newAudit(before, afterState, ledgerId);
    assertTransition(beforeEntry, afterEntry, audit.action);

    const commands = [
      { role: "ledger", op: beforeEntry ? "update" : "create", path: `ledgerEntries/${ledgerId}`, data: A.ledgerDocument(afterEntry, Timestamp, audit.id) },
      { role: "audit", op: "create", path: `ledgerAudit/${audit.id}`, data: A.auditDocument(audit, ownerUid, Timestamp) },
      { role: "website", op: "update", path: "publicProject/website", data: A.websiteDocument(afterState, Timestamp, audit) }
    ];
    if (afterEntry.publicApproved) {
      commands.push({
        role: "public",
        op: beforeEntry && beforeEntry.publicApproved ? "update" : "create",
        path: `publicSupporters/${ledgerId}`,
        data: A.publicSupporterDocument(afterEntry, Timestamp)
      });
    } else if (beforeEntry && beforeEntry.publicApproved) {
      commands.push({ role: "public", op: "delete", path: `publicSupporters/${ledgerId}` });
    }
    return commands;
  }

  async function buildProtectedBatchCommands(input) {
    const commands = buildBatchCommands(input);
    const ledger = commands.find((item) => item.role === "ledger");
    if (!ledger || !ledger.data || !ledger.data.transactionId) throw new Error("Private Buchungsoperation fehlt.");
    const refId = await R.paymentRefId(ledger.data.transactionId);
    ledger.data.paymentRefId = refId;
    if (ledger.op === "create") {
      const ledgerId = ledger.path.split("/")[1];
      const entry = Object.values(input.afterState.ledgerEntries).find((item) => item.ledgerId === ledgerId);
      if (!entry) throw new Error("Buchung für Referenzreservierung fehlt.");
      commands.splice(1, 0, {
        role: "paymentRef",
        op: "create",
        path: `paymentRefs/${refId}`,
        data: R.referenceDocument(entry, input.Timestamp)
      });
    }
    return commands;
  }

  return { buildBatchCommands, buildProtectedBatchCommands };
});
