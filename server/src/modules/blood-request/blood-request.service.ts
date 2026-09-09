import mongoose from "mongoose";
import BloodRequest from "./blood-request.model";
import {
  ALLOWED_TRANSITIONS,
  type IBloodRequestDocument,
  type RequestStatus,
  type BloodGroup,
  type BloodComponent,
  type Urgency,
} from "./blood-request.types";
import type { CreateBloodRequestInput } from "./blood-request.validation";

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Urgency → default TTL in hours.
 * Used when expiresAt is not explicitly provided by the client.
 */
const EXPIRY_HOURS: Record<string, number> = {
  critical: 12,
  urgent:   24,
  normal:   48,
};

export const createBloodRequest = async (
  requestedBy: string,
  input: CreateBloodRequestInput,
): Promise<IBloodRequestDocument> => {
  const { hospitalLocation, ...rest } = input;

  // Compute expiration time
  const now = new Date();
  let expiresAt: Date;
  if (input.expiresAt) {
    expiresAt = new Date(input.expiresAt);
  } else {
    const hoursToAdd = EXPIRY_HOURS[input.urgency ?? "normal"] ?? 48;
    expiresAt = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  const doc = await BloodRequest.create({
    ...rest,
    bloodGroup:      rest.bloodGroup      as BloodGroup,
    bloodComponent:  rest.bloodComponent  as BloodComponent,
    urgency:         rest.urgency         as Urgency,
    requestedBy: new mongoose.Types.ObjectId(requestedBy),
    hospitalLocation: {
      type: "Point",
      coordinates: [hospitalLocation.longitude, hospitalLocation.latitude],
    },
    requiredAt: new Date(input.requiredAt),
    expiresAt,
  });

  return doc;
};

// ─── List (paginated + filtered) ──────────────────────────────────────────────

export interface ListBloodRequestsOptions {
  page: number;
  limit: number;
  status?: string;
  bloodGroup?: string;
  urgency?: string;
  requestedBy?: string;
}

export const listBloodRequests = async (opts: ListBloodRequestsOptions) => {
  const { page, limit, status, bloodGroup, urgency, requestedBy } = opts;

  // Build filter — only include validated values
  const filter: Record<string, unknown> = {};

  if (status)      filter["status"]      = status;
  if (bloodGroup)  filter["bloodGroup"]  = bloodGroup;
  if (urgency)     filter["urgency"]     = urgency;
  if (requestedBy && mongoose.isValidObjectId(requestedBy)) {
    filter["requestedBy"] = new mongoose.Types.ObjectId(requestedBy);
  }

  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      // Sort: critical first, then by urgency level, then newest first
      .sort({ urgency: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("requestedBy", "firstName lastName email role")
      .lean(),
    BloodRequest.countDocuments(filter),
  ]);

  return { requests, meta: { page, limit, total } };
};

// ─── Get one ──────────────────────────────────────────────────────────────────

export const getBloodRequestById = async (
  id: string,
): Promise<IBloodRequestDocument | null> => {
  if (!mongoose.isValidObjectId(id)) return null;

  const doc = await BloodRequest.findById(id).populate(
    "requestedBy",
    "firstName lastName email role",
  );

  if (!doc) return null;

  // Lazy expiry: if still active but past expiresAt, transition now
  const activeStatuses: RequestStatus[] = ["searching", "partiallyFulfilled"];
  if (
    activeStatuses.includes(doc.status) &&
    doc.expiresAt &&
    doc.expiresAt <= new Date()
  ) {
    doc.status = "expired";
    await doc.save();
  }

  return doc;
};

// ─── Status transition ────────────────────────────────────────────────────────

export const updateBloodRequestStatus = async (
  id: string,
  requestedBy: string,
  newStatus: RequestStatus,
  userRole: string,
): Promise<IBloodRequestDocument> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid request ID.");
  }

  const doc = await BloodRequest.findById(id);
  if (!doc) throw new Error("Blood request not found.");

  // Lazy expiry check
  const activeStatuses: RequestStatus[] = ["searching", "partiallyFulfilled"];
  if (
    activeStatuses.includes(doc.status) &&
    doc.expiresAt &&
    doc.expiresAt <= new Date()
  ) {
    doc.status = "expired";
    await doc.save();
    throw new Error("Blood request has expired.");
  }

  // Ownership check — only creator or admin may change status
  const isOwner = doc.requestedBy.toString() === requestedBy;
  const isAdmin = userRole === "admin";

  if (!isOwner && !isAdmin) {
    throw new Error("You are not authorised to modify this request.");
  }

  // State machine check
  const allowed = ALLOWED_TRANSITIONS[doc.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from '${doc.status}' to '${newStatus}'.`,
    );
  }

  doc.status = newStatus;
  await doc.save();
  return doc;
};

// ─── Cancel ───────────────────────────────────────────────────────────────────

export const cancelBloodRequest = async (
  id: string,
  requestedBy: string,
  userRole: string,
): Promise<IBloodRequestDocument> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid request ID.");
  }

  const doc = await BloodRequest.findById(id);
  if (!doc) throw new Error("Blood request not found.");

  const isOwner = doc.requestedBy.toString() === requestedBy;
  const isAdmin = userRole === "admin";

  if (!isOwner && !isAdmin) {
    throw new Error("You are not authorised to cancel this request.");
  }

  const terminale: RequestStatus[] = ["fulfilled", "expired", "cancelled"];
  if (terminale.includes(doc.status)) {
    throw new Error(`Cannot cancel a request that is already '${doc.status}'.`);
  }

  doc.status = "cancelled";
  await doc.save();
  return doc;
};
