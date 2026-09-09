// ─── Shared enums ─────────────────────────────────────────────────────────────

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const BLOOD_COMPONENTS = [
  'Whole Blood',
  'Red Blood Cells',
  'Plasma',
  'Platelets',
] as const;
export type BloodComponent = (typeof BLOOD_COMPONENTS)[number];

export const URGENCY_VALUES = ['critical', 'urgent', 'normal'] as const;
export type Urgency = (typeof URGENCY_VALUES)[number];

export const STATUS_VALUES = [
  'searching',
  'partiallyFulfilled',
  'fulfilled',
  'expired',
  'cancelled',
] as const;
export type RequestStatus = (typeof STATUS_VALUES)[number];

// ─── GeoJSON point (matches server shape) ─────────────────────────────────────

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// ─── Donor response subdoc ────────────────────────────────────────────────────

export type DonorResponseStatus = 'pending' | 'accepted' | 'withdrawn';

export interface DonorResponse {
  _id: string;
  donorId: string;
  donorName: string;
  bloodGroup: BloodGroup;
  status: DonorResponseStatus;
  respondedAt: string;
  note?: string;
}

// ─── Blood request ────────────────────────────────────────────────────────────

export interface BloodRequest {
  _id: string;
  requestedBy: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
  } | string;
  patientName: string;
  bloodGroup: BloodGroup;
  bloodComponent: BloodComponent;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalName: string;
  hospitalLocation: GeoPoint;
  requiredAt: string;
  /** ISO datetime — backend-enforced hard expiration */
  expiresAt: string;
  urgency: Urgency;
  additionalInformation?: string;
  status: RequestStatus;
  donorResponses: DonorResponse[];
  createdAt: string;
  updatedAt: string;
}

// ─── API payloads ─────────────────────────────────────────────────────────────

export interface CreateBloodRequestPayload {
  patientName: string;
  bloodGroup: string;
  bloodComponent: string;
  unitsRequired: number;
  hospitalName: string;
  hospitalLocation: { latitude: number; longitude: number };
  requiredAt: string;
  /** Optional explicit expiry ISO string. If omitted, backend applies urgency-based TTL. */
  expiresAt?: string;
  urgency: string;
  additionalInformation?: string;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ListBloodRequestsResponse {
  requests: BloodRequest[];
  meta: ListMeta;
}

// ─── Nearby donor ─────────────────────────────────────────────────────────────

export interface NearbyDonor {
  _id: string;
  firstName?: string;
  lastName?: string;
  bloodGroup: BloodGroup;
  isAvailable: boolean;
  isVerified: boolean;
  distanceMetres: number;
  distanceKm: number;
  location: GeoPoint;
}

export interface NearbyDonorsResponse {
  donors: NearbyDonor[];
  meta: {
    count: number;
    bloodGroup: string;
    radiusKm: number;
    latitude: number;
    longitude: number;
    queryMs: number;
  };
}
