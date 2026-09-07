/**
 * Centralized blood-group compatibility utility.
 *
 * Direction: recipient blood group → compatible DONOR blood groups
 *
 * Rules (standard ABO + Rh compatibility):
 *   A+  can receive from  A+, A-, O+, O-
 *   A-  can receive from  A-, O-
 *   B+  can receive from  B+, B-, O+, O-
 *   B-  can receive from  B-, O-
 *   AB+ can receive from  all 8 groups  (universal recipient)
 *   AB- can receive from  AB-, A-, B-, O-
 *   O+  can receive from  O+, O-
 *   O-  can receive from  O-            (universal donor)
 */

import type { BloodGroup } from "../modules/user/user.types";

// All supported blood groups — single source of truth
export const ALL_BLOOD_GROUPS: readonly BloodGroup[] = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
] as const;

/**
 * Map: recipient blood group → list of compatible donor blood groups.
 * Only this map needs to change if compatibility rules ever evolve.
 */
export const COMPATIBLE_DONORS: Readonly<Record<BloodGroup, readonly BloodGroup[]>> = {
  "A+":  ["A+", "A-", "O+", "O-"],
  "A-":  ["A-", "O-"],
  "B+":  ["B+", "B-", "O+", "O-"],
  "B-":  ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+":  ["O+", "O-"],
  "O-":  ["O-"],
};

/**
 * Returns the donor blood groups that are compatible with the given
 * recipient/request blood group.
 *
 * @param recipientGroup - The blood group needed by the patient/request.
 * @returns Array of compatible donor blood groups.
 * @throws  If recipientGroup is not a recognised blood group.
 */
export function getCompatibleDonorGroups(recipientGroup: BloodGroup): BloodGroup[] {
  const compatible = COMPATIBLE_DONORS[recipientGroup];
  if (!compatible) {
    throw new Error(`Unrecognised blood group: ${recipientGroup}`);
  }
  return [...compatible];
}

/**
 * Returns true if donorGroup can donate to recipientGroup.
 *
 * @param donorGroup     - The donor's blood group.
 * @param recipientGroup - The patient/request blood group.
 */
export function isDonorCompatible(
  donorGroup: BloodGroup,
  recipientGroup: BloodGroup,
): boolean {
  const compatible = COMPATIBLE_DONORS[recipientGroup];
  if (!compatible) return false;
  return (compatible as readonly string[]).includes(donorGroup);
}

/**
 * Type-guard: returns true when the string is a valid BloodGroup.
 */
export function isValidBloodGroup(value: unknown): value is BloodGroup {
  return typeof value === "string" &&
    (ALL_BLOOD_GROUPS as readonly string[]).includes(value);
}
