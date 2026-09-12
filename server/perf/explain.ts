/**
 * perf/explain.ts — MongoDB query-plan report for RedPulse's hot queries.
 *
 * Runs .explain("executionStats") against the *exact* filter/sort/limit
 * combinations the service layer issues, then prints, per query:
 *   - the winning plan's stage chain and the index it chose
 *   - nReturned vs totalDocsExamined (the examine/return ratio)
 *   - whether a blocking in-memory SORT stage was required
 *   - executionTimeMillis
 *
 * STRICTLY READ-ONLY — issues no writes and creates no indexes. Safe anywhere.
 *
 * Run:  node_modules/.bin/tsx perf/explain.ts
 */

import "dotenv/config";
import mongoose from "mongoose";

import User from "../src/modules/user/user.model";
import BloodRequest from "../src/modules/blood-request/blood-request.model";
import Inventory from "../src/modules/inventory/inventory.model";
import { getCompatibleDonorGroups, COMPATIBLE_DONORS } from "../src/shared/blood-compatibility";

// ─── Explain-plan summarisation ────────────────────────────────────────────────

interface PlanSummary {
  stages: string[];
  indexes: string[];
  nReturned?: number;
  docsExamined?: number;
  keysExamined?: number;
  millis?: number;
  hasBlockingSort: boolean;
}

/** Recursively walk an explain document, collecting stages / indexes / stats. */
const summarize = (explain: unknown): PlanSummary => {
  const stages: string[] = [];
  const indexes: string[] = [];
  let nReturned: number | undefined;
  let docsExamined: number | undefined;
  let keysExamined: number | undefined;
  let millis: number | undefined;
  let hasBlockingSort = false;

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const obj = node as Record<string, unknown>;

    if (typeof obj.stage === "string") {
      stages.push(obj.stage);
      if (obj.stage === "SORT") hasBlockingSort = true;
    }
    // Aggregation pipelines report stages under a $-prefixed key instead.
    if (typeof obj.$sort === "object" && obj.$sort !== null) hasBlockingSort = true;

    if (typeof obj.indexName === "string" && !indexes.includes(obj.indexName)) {
      indexes.push(obj.indexName);
    }

    // executionStats lives at the top for find(), nested under $cursor for aggregate()
    if (typeof obj.nReturned === "number" && nReturned === undefined) {
      nReturned = obj.nReturned;
    }
    if (typeof obj.totalDocsExamined === "number" && docsExamined === undefined) {
      docsExamined = obj.totalDocsExamined;
    }
    if (typeof obj.totalKeysExamined === "number" && keysExamined === undefined) {
      keysExamined = obj.totalKeysExamined;
    }
    if (typeof obj.executionTimeMillis === "number" && millis === undefined) {
      millis = obj.executionTimeMillis;
    }

    Object.values(obj).forEach(walk);
  };

  walk(explain);
  return { stages, indexes, nReturned, docsExamined, keysExamined, millis, hasBlockingSort };
};

const report = (label: string, explain: unknown): void => {
  const s = summarize(explain);
  const scan = s.stages.includes("COLLSCAN")
    ? "COLLSCAN"
    : s.stages.find((st) => st.includes("IXSCAN") || st === "GEO_NEAR_2DSPHERE" || st === "DISTINCT_SCAN")
      ?? s.stages[0]
      ?? "unknown";

  const ratio =
    s.nReturned !== undefined && s.docsExamined !== undefined && s.nReturned > 0
      ? (s.docsExamined / s.nReturned).toFixed(1)
      : "n/a";

  console.log(`\n── ${label}`);
  console.log(`   scan            : ${scan}`);
  console.log(`   index           : ${s.indexes.length ? s.indexes.join(", ") : "(none)"}`);
  console.log(`   nReturned       : ${s.nReturned ?? "?"}`);
  console.log(`   keysExamined    : ${s.keysExamined ?? "?"}`);
  console.log(`   docsExamined    : ${s.docsExamined ?? "?"}  (examined/returned = ${ratio})`);
  console.log(`   blocking SORT   : ${s.hasBlockingSort ? "YES  <-- in-memory sort" : "no"}`);
  console.log(`   executionTimeMs : ${s.millis ?? "?"}`);
  console.log(`   stage chain     : ${s.stages.join(" <- ") || "(none)"}`);
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set — cannot run explain plans.");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const host = mongoose.connection.host;
  const dbName = mongoose.connection.name;
  console.log(`Connected: host=${host} db=${dbName}`);

  // ── Collection sizes (context for whether a COLLSCAN actually matters) ────
  const [userCount, requestCount, inventoryCount] = await Promise.all([
    User.estimatedDocumentCount(),
    BloodRequest.estimatedDocumentCount(),
    Inventory.estimatedDocumentCount(),
  ]);
  console.log("\n=== COLLECTION SIZES ===");
  console.log(`users            : ${userCount}`);
  console.log(`bloodrequests    : ${requestCount}`);
  console.log(`inventories      : ${inventoryCount}`);

  // ── Current indexes actually present in the database ─────────────────────
  console.log("\n=== INDEXES PRESENT IN DB ===");
  for (const [name, model] of [
    ["users", User],
    ["bloodrequests", BloodRequest],
    ["inventories", Inventory],
  ] as const) {
    const idx = await model.collection.indexes();
    console.log(`\n${name}:`);
    for (const i of idx) {
      console.log(`   ${i.name}  ${JSON.stringify(i.key)}`);
    }
  }

  console.log("\n\n=== QUERY PLANS ===");

  // 1. Nearby donor search — donor.service.findNearbyDonors
  const compatibleGroups = getCompatibleDonorGroups("O+");
  report(
    "User.$geoNear — nearby donor search (donor.service.findNearbyDonors)",
    await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [77.209, 28.6139] },
          distanceField: "distanceMetres",
          maxDistance: 10_000,
          spherical: true,
          query: {
            role: "donor",
            isAvailable: true,
            bloodGroup: { $in: compatibleGroups },
            location: { $exists: true, $ne: null },
          },
        },
      },
      { $limit: 50 },
    ]).explain("executionStats"),
  );

  // 2. Blood-request list — blood-request.service.listBloodRequests
  report(
    "BloodRequest.find — list by status, sort { urgency, createdAt } (listBloodRequests)",
    await BloodRequest.find({ status: "searching" })
      .sort({ urgency: 1, createdAt: -1 })
      .skip(0)
      .limit(10)
      .explain("executionStats"),
  );

  // 3. Blood-request list scoped to one requester ("my requests")
  const anyRequester = await BloodRequest.findOne().select("requestedBy").lean();
  if (anyRequester) {
    report(
      "BloodRequest.find — list by requestedBy, sort { urgency, createdAt }",
      await BloodRequest.find({ requestedBy: anyRequester.requestedBy })
        .sort({ urgency: 1, createdAt: -1 })
        .skip(0)
        .limit(10)
        .explain("executionStats"),
    );
  }

  // 4. Donor discover — donor-response.service.discoverRequestsForDonor
  const recipientGroups = (
    Object.entries(COMPATIBLE_DONORS) as [string, readonly string[]][]
  )
    .filter(([, donors]) => donors.includes("O+"))
    .map(([recipient]) => recipient);
  report(
    "BloodRequest.find — donor discover (status + bloodGroup + expiresAt + $ne donor)",
    await BloodRequest.find({
      status: { $in: ["searching", "partiallyFulfilled"] },
      bloodGroup: { $in: recipientGroups },
      "donorResponses.donorId": { $ne: new mongoose.Types.ObjectId() },
      expiresAt: { $gt: new Date() },
    })
      .sort({ urgency: 1, requiredAt: 1 })
      .skip(0)
      .limit(10)
      .explain("executionStats"),
  );

  // 5. Expiration sweep — expiration.worker.runExpirationSweep (runs every 60s)
  report(
    "BloodRequest.find — expiration sweep filter { status $in, expiresAt $lte } (every 60s)",
    await BloodRequest.find({
      status: { $in: ["searching", "partiallyFulfilled"] },
      expiresAt: { $lte: new Date() },
    }).explain("executionStats"),
  );

  // 6. Admin user list — admin.service.listUsers
  report(
    "User.find — admin listUsers by role, sort { createdAt: -1 }",
    await User.find({ role: "donor" })
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(20)
      .explain("executionStats"),
  );

  // 7. Pending verification — admin.service.getPendingVerificationUsers
  report(
    "User.find — pending verification { isVerified: false, role $ne admin }, sort createdAt",
    await User.find({ isVerified: false, role: { $ne: "admin" } })
      .sort({ createdAt: -1 })
      .limit(10)
      .explain("executionStats"),
  );

  // 8. Platform stats aggregations — admin.service.getPlatformStats
  report(
    "User.aggregate — $group by role (getPlatformStats)",
    await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]).explain(
      "executionStats",
    ),
  );
  report(
    "BloodRequest.aggregate — $group by status (getPlatformStats)",
    await BloodRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).explain("executionStats"),
  );

  // 9. Inventory read — inventory.service.getInventory
  const anyBank = await Inventory.findOne().select("bloodBankId").lean();
  if (anyBank) {
    report(
      "Inventory.find — by bloodBankId, sort { bloodGroup: 1 } (getInventory)",
      await Inventory.find({ bloodBankId: anyBank.bloodBankId })
        .sort({ bloodGroup: 1 })
        .explain("executionStats"),
    );
  } else {
    console.log("\n── Inventory.find — SKIPPED (inventories collection is empty)");
  }

  await mongoose.disconnect();
  console.log("\nDone.");
};

main().catch(async (err) => {
  console.error("explain.ts failed:", err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
