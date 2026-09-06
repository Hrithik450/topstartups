/**
 * Client-safe Founder Credentials Validation & LocalStorage Integrity Guard
 *
 * Protects against localStorage manipulation, corruption, incomplete records,
 * and masked/placeholder emails (e.g. 'mh***@gmail.com').
 */

export interface StoredFounderCredentials {
  name: string;
  email: string;
}

export interface StoredCredentialsValidationResult {
  valid: boolean;
  credentials?: StoredFounderCredentials;
  isCorrupted: boolean;
  isMissing: boolean;
  error?: string;
}

// RFC 5322 compliant regex filter for client validation
const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates raw founder credentials from localStorage or user input.
 * Strictly verifies types, length, character sets, and email structure.
 */
export function validateStoredFounderCredentials(
  rawName: unknown,
  rawEmail: unknown
): StoredCredentialsValidationResult {
  const hasName =
    rawName !== null &&
    rawName !== undefined &&
    typeof rawName === "string" &&
    rawName.trim().length > 0;
  const hasEmail =
    rawEmail !== null &&
    rawEmail !== undefined &&
    typeof rawEmail === "string" &&
    rawEmail.trim().length > 0;

  // Both missing
  if (!hasName && !hasEmail) {
    return {
      valid: false,
      isMissing: true,
      isCorrupted: false,
      error: "No stored founder credentials found.",
    };
  }

  // One field missing while the other exists
  if (!hasName || !hasEmail) {
    return {
      valid: false,
      isMissing: true,
      isCorrupted: false,
      error: !hasName ? "Founder name is missing." : "Founder email is missing.",
    };
  }

  const cleanName = (rawName as string).trim();
  const cleanEmail = (rawEmail as string).trim().toLowerCase();

  // Name validation:
  // Must be 2-100 characters
  // Must contain at least one alphabetic letter
  // Must not contain script tags or dangerous HTML characters
  if (
    cleanName.length < 2 ||
    cleanName.length > 100 ||
    !/[a-zA-Z]/.test(cleanName) ||
    /[<>{}\\\/]/.test(cleanName)
  ) {
    return {
      valid: false,
      isMissing: false,
      isCorrupted: true,
      error: "Founder name contains invalid or corrupted characters.",
    };
  }

  // Email validation:
  // Must not contain masked placeholder asterisks (e.g. mh***@gmail.com)
  // Must not contain spaces or control characters
  // Must match strict email syntax
  if (
    cleanEmail.includes("*") ||
    cleanEmail.includes(" ") ||
    cleanEmail.length < 5 ||
    cleanEmail.length > 254 ||
    !STRICT_EMAIL_REGEX.test(cleanEmail)
  ) {
    return {
      valid: false,
      isMissing: false,
      isCorrupted: true,
      error: "Founder email is corrupted, masked, or improperly formatted.",
    };
  }

  const domainParts = cleanEmail.split("@")[1]?.split(".") || [];
  if (domainParts.length < 2) {
    return {
      valid: false,
      isMissing: false,
      isCorrupted: true,
      error: "Email domain is missing a top-level domain extension.",
    };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return {
      valid: false,
      isMissing: false,
      isCorrupted: true,
      error: "Email top-level domain is invalid.",
    };
  }

  return {
    valid: true,
    isMissing: false,
    isCorrupted: false,
    credentials: {
      name: cleanName,
      email: cleanEmail,
    },
  };
}

/**
 * Safely fetches and validates founder credentials from localStorage.
 * Automatically purges storage if data has been manipulated or corrupted.
 */
export function getValidatedFounderCredentials(): StoredCredentialsValidationResult {
  if (typeof window === "undefined") {
    return { valid: false, isMissing: true, isCorrupted: false };
  }

  try {
    const rawEmail = localStorage.getItem("getopfloor_manage_email");
    const rawName = localStorage.getItem("getopfloor_founder_name");

    const result = validateStoredFounderCredentials(rawName, rawEmail);

    if (result.isCorrupted) {
      // Purge corrupted values immediately
      clearStoredFounderCredentials();
    }

    return result;
  } catch (e) {
    console.warn("Error accessing localStorage:", e);
    clearStoredFounderCredentials();
    return { valid: false, isMissing: false, isCorrupted: true };
  }
}

/**
 * Completely purges founder credentials from localStorage.
 */
export function clearStoredFounderCredentials(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("getopfloor_manage_email");
    localStorage.removeItem("getopfloor_founder_name");
  } catch {}
}

/**
 * Safely saves validated founder credentials to localStorage.
 */
export function saveFounderCredentials(name: string, email: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const result = validateStoredFounderCredentials(name, email);
    if (result.valid && result.credentials) {
      localStorage.setItem("getopfloor_founder_name", result.credentials.name);
      localStorage.setItem("getopfloor_manage_email", result.credentials.email);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
