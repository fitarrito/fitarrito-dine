"use client";

import {
  ONLINE_ORDERING_CLOSED_MESSAGE,
  ONLINE_ORDERING_CLOSED_TITLE,
} from "@lib/onlineOrdering";
import { useOnlineOrdering } from "@lib/useOnlineOrdering";
import styles from "./OnlineOrderingClosedNotice.module.css";

export default function OnlineOrderingClosedNotice() {
  const ordering = useOnlineOrdering();

  if (ordering.enabled !== false) return null;

  return (
    <p className={styles.notice} role="status">
      <strong>{ONLINE_ORDERING_CLOSED_TITLE}</strong>
      <span>{ONLINE_ORDERING_CLOSED_MESSAGE}</span>
    </p>
  );
}
