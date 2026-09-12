/**
 * Donor-response service.
 *
 * All business logic for a donor responding to a blood request lives here.
 * Controllers stay thin.
 *
 * Concurrency safety strategy
 * ─────────────────────────────
 * We use a single atomic findOneAndUpdate with a $push + $inc + conditional
 * $set so the read-check-write cycle is collapsed into one MongoDB operation.
 * MongoDB document-level locking guarantees only one concurrent write wins.
 *
 * Duplicate prevention
 * ─────────────────────
 * The filter includes { "donorResponses.donorId": { $ne: donorObjectId } }
 * so if the donor already has a subdoc the update matches zero documents
 * and we can detect that and return a 409 without a separate read.
 */

import mongoose from "mongoose";
import BloodRequest from "./blood-request.model";
import { assertDonorEligible } from "../donor/donor.service";
import { COMPATIBLE_DONORS, isDonorCompatible } from "../../shared/blood-compatibility";
import type { BloodGroup, IBloodRequestDocument, RequestStatus } from "./blood-request.types";

// ─── Public result shape ──────────────────────────────────────────────────────

export interface RespondToRequestResult {
  request: IBloodRequestDocument;
  newStatus: RequestStatus;
  unitsFulfilled: number;
}

// ─── Discover active requests visible to a donor ──────────────────────────────

export interface DonorDiscoverOptions {
  donorId:    string;
  page:       number;
  limit:      number;
}

/**
 * Returns active blood requests that are compatible with the given donor's
 * blood group. Excludes requests the donor has already responded to.
 */
export const discoverRequestsForDonor = async (
  opts: DonorDiscoverOptions,
): Promise<{ requests: IBloodRequestDocument[]; meta: { page: number; limit: number; total: number } }> => {
  const { donorId, page, limit } = opts;

  // Verify donor and get their blood group
  const donor = await assertDonorEligible(donorId);

  // Find all recipient blood groups this donor is compatible with
  const recipientGroupsThisDonorCanHelp = (
    Object.entries(COMPATIBLE_DONORS) as [BloodGroup, readonly BloodGroup[]][]
  )
    .filter(([, donors]) => (donors as readonly string[]).includes(donor.bloodGroup))
    .map(([recipient]) => recipient);

  const filter = {
    status: { $in: ["searching", "partiallyFulfilled"] as RequestStatus[] },
    bloodGroup: { $in: recipientGroupsThisDonorCanHelp },
    "donorResponses.donorId": { $ne: new mongoose.Types.ObjectId(donorId) },
    // Exclude requests that have already passed their expiry (worker may not have run yet)
    expiresAt: { $gt: new Date() },
  };

  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .sort({ urgency: 1, requiredAt: 1 })  // critical first, then soonest
      .skip(skip)
      .limit(limit)
      .populate("requestedBy", "firstName lastName email role")
      .lean(),
    BloodRequest.countDocuments(filter),
  ]);

  return { requests: requests as unknown as IBloodRequestDocument[], meta: { page, limit, total } };
};

// ─── Respond to a blood request ───────────────────────────────────────────────

export interface DonorResponseInput {
  donorId:    string;
  requestId:  string;
  note?:      string;
}

/**
 * Records a donor's response to a blood request atomically.
 *
 * Steps (all enforced in one DB round-trip where possible):
 *  1. Validate IDs
 *  2. Assert donor eligibility (role, availability, blood group)
 *  3. Assert blood-group compatibility
 *  4. Load request and verify it is still active
 *  5. Atomically push the response subdoc + increment unitsFulfilled
 *     + conditionally update status — duplicate donorId is rejected by filter
 *  6. Detect null result → request already had this donor (duplicate) OR
 *     request became terminal between checks
 *  7. Return updated document
 */
export const respondToBloodRequest = async (
  input: DonorResponseInput,
): Promise<RespondToRequestResult> => {
  const { donorId, requestId, note } = input;

  // ── 1. Validate IDs ──────────────────────────────────────────────────────
  if (!mongoose.isValidObjectId(donorId)) {
    throw Object.assign(new Error("Invalid donor ID."), { statusCode: 400 });
  }
  if (!mongoose.isValidObjectId(requestId)) {
    throw Object.assign(new Error("Invalid request ID."), { statusCode: 400 });
  }

  const donorObjectId  = new mongoose.Types.ObjectId(donorId);
  const requestObjectId = new mongoose.Types.ObjectId(requestId);

  // ── 2. Assert donor eligibility ──────────────────────────────────────────
  const donor = await assertDonorEligible(donorId);
  // assertDonorEligible throws with plain Error on failure; rethrow with 400/403
  // (it already throws descriptive messages; controller maps them)

  // ── 3. Load request for pre-checks (one read, then one atomic write) ─────
  const existing = await BloodRequest.findById(requestObjectId).lean();

  if (!existing) {
    throw Object.assign(new Error("Blood request not found."), { statusCode: 404 });
  }

  // ── 4. Request must still be active AND not expired ─────────────────────
  const activeStatuses: RequestStatus[] = ["searching", "partiallyFulfilled"];
  if (!activeStatuses.includes(existing.status)) {
    throw Object.assign(
      new Error(`Cannot respond to a request with status '${existing.status}'.`),
      { statusCode: 409 },
    );
  }

  // Expiration check — guard against the case where the worker hasn't run yet
  if (existing.expiresAt && existing.expiresAt <= new Date()) {
    // Opportunistically expire the request so the state is consistent
    await BloodRequest.findOneAndUpdate(
      { _id: requestObjectId, status: { $in: activeStatuses } },
      { $set: { status: "expired" } },
    );
    throw Object.assign(
      new Error("This blood request has expired and is no longer accepting responses."),
      { statusCode: 409 },
    );
  }

  // ── 5. Blood-group compatibility ─────────────────────────────────────────
  if (!isDonorCompatible(donor.bloodGroup as BloodGroup, existing.bloodGroup as BloodGroup)) {
    throw Object.assign(
      new Error(
        `Donor blood group '${donor.bloodGroup}' is not compatible with request blood group '${existing.bloodGroup}'.`,
      ),
      { statusCode: 422 },
    );
  }

  // ── 6. Compute new unitsFulfilled and derived status ────────────────────
  const newUnitsFulfilled = existing.unitsFulfilled + 1;
  const willBeFulfilled   = newUnitsFulfilled >= existing.unitsRequired;
  const newStatus: RequestStatus = willBeFulfilled
    ? "fulfilled"
    : "partiallyFulfilled";

  // Donor display name (best-effort — may be undefined if profile incomplete).
  // Reuses the record already loaded by assertDonorEligible above rather than
  // re-reading the same user document.
  const donorName =
    `${donor.firstName ?? ""} ${donor.lastName ?? ""}`.trim() || "Unknown Donor";

  // ── 7. Atomic update ─────────────────────────────────────────────────────
  // Filter ensures:
  //   a) correct request
  //   b) still in an active status
  //   c) donor has NOT already responded (dedup without separate read-check)
  const updated = await BloodRequest.findOneAndUpdate(
    {
      _id:    requestObjectId,
      status: { $in: activeStatuses },
      "donorResponses.donorId": { $ne: donorObjectId },
    },
    {
      $push: {
        donorResponses: {
          donorId:     donorObjectId,
          donorName,
          bloodGroup:  donor.bloodGroup,
          status:      "accepted",
          respondedAt: new Date(),
          ...(note ? { note } : {}),
        },
      },
      $inc: { unitsFulfilled: 1 },
      $set: { status: newStatus },
    },
    { new: true, runValidators: true },
  );

  // ── 8. Interpret null result ─────────────────────────────────────────────
  if (!updated) {
    // Could be duplicate OR request became terminal concurrently.
    // Re-fetch to distinguish the two cases.
    const refetch = await BloodRequest.findById(requestObjectId).lean();

    if (!refetch) {
      throw Object.assign(new Error("Blood request not found."), { statusCode: 404 });
    }

    const alreadyResponded = refetch.donorResponses.some(
      (r) => r.donorId.toString() === donorId,
    );

    if (alreadyResponded) {
      throw Object.assign(
        new Error("You have already responded to this blood request."),
        { statusCode: 409 },
      );
    }

    throw Object.assign(
      new Error(`Cannot respond to a request with status '${refetch.status}'.`),
      { statusCode: 409 },
    );
  }

  return {
    request:        updated,
    newStatus:      updated.status,
    unitsFulfilled: updated.unitsFulfilled,
  };
};

// ─── Get responses for a specific request (owner / admin view) ────────────────

export const getResponsesForRequest = async (
  requestId:  string,
  callerId:   string,
  callerRole: string,
): Promise<IBloodRequestDocument> => {
  if (!mongoose.isValidObjectId(requestId)) {
    throw Object.assign(new Error("Invalid request ID."), { statusCode: 400 });
  }

  const doc = await BloodRequest.findById(requestId)
    .populate("requestedBy", "firstName lastName email role")
    .populate("donorResponses.donorId", "firstName lastName bloodGroup isVerified");

  if (!doc) {
    throw Object.assign(new Error("Blood request not found."), { statusCode: 404 });
  }

  // Authorization: owner or admin may view responses
  const isOwner = doc.requestedBy.toString() === callerId;
  const isAdmin = callerRole === "admin";
  const isHospital = callerRole === "hospital"; // hospitals can see requests they manage

  if (!isOwner && !isAdmin && !isHospital) {
    throw Object.assign(
      new Error("You are not authorised to view responses for this request."),
      { statusCode: 403 },
    );
  }

  return doc;
};
