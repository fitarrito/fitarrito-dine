export const STAFF_HOSTNAME = "staff.fitarrito.com";

export function hostnamesFromHeader(host: string | null) {
  return (host ?? "")
    .split(",")
    .map((value) => value.trim().split(":")[0]?.toLowerCase() ?? "")
    .filter(Boolean);
}

export function isStaffHostname(host: string | null) {
  return hostnamesFromHeader(host).includes(STAFF_HOSTNAME);
}

export function isStaffHostHeaderList(
  hosts: Array<string | null | undefined>,
) {
  return hosts.some((host) => isStaffHostname(host ?? null));
}
