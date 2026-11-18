export const SPECIAL_REQUESTS_MAX_LENGTH = 1000;

export function readSpecialRequests(value: unknown) {
  if (value == null || value === "") {
    return { specialRequests: null as string | null };
  }

  if (typeof value !== "string") {
    return { error: "Special requests must be text." };
  }

  const specialRequests = value.trim();

  if (!specialRequests) {
    return { specialRequests: null };
  }

  if (specialRequests.length > SPECIAL_REQUESTS_MAX_LENGTH) {
    return { error: "Special requests must be 1000 characters or fewer." };
  }

  return { specialRequests };
}
