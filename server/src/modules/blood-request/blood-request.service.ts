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

export const createBloodRequest = async (
  requestedBy: string,
  input: CreateBloodRequestInput,
): Promise<IBloodRequestDocument> => {
  const { hospitalLocation, ...rest } = input;

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
      .sort({ createdAt: -1 })
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
  return BloodRequest.findById(id).populate(
    "requestedBy",
    "firstName lastName email role",
  );
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
