"use client";

import { useEffect, useState } from "react";
import { FaLock, FaSun } from "react-icons/fa";
import {
  ONLINE_ORDERING_CLOSED_MESSAGE,
  ONLINE_ORDERING_CLOSED_TITLE,
} from "@lib/onlineOrdering";
import { useOnlineOrdering } from "@lib/useOnlineOrdering";
import styles from "./OnDemandOrderingBanner.module.css";

const DEFAULT_SUBTITLE = "Enjoy our freshly prepared Asian bowls and curries!";

type OnDemandOrderingBannerProps = {
  subtitle?: string;
};

export default function OnDemandOrderingBanner({
  subtitle = DEFAULT_SUBTITLE,
}: OnDemandOrderingBannerProps) {
  const [ready, setReady] = useState(false);
  const ordering = useOnlineOrdering();
  const manuallyClosed = ordering.enabled === false;

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <section className={styles.banner} aria-label="On-demand ordering information">
      <div className={styles.intro}>
        <span className={styles.clockIcon} aria-hidden>
          ⏰
        </span>
        <div>
          <h2 className={styles.title}>On-Demand Ordering</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>

      {ready && manuallyClosed ? (
        <div className={styles.status}>
          <span className={styles.closedIcon} aria-hidden>
            <FaLock />
          </span>
          <div>
            <p className={styles.statusTitle}>{ONLINE_ORDERING_CLOSED_TITLE}</p>
            <p className={styles.statusMessage}>{ONLINE_ORDERING_CLOSED_MESSAGE}</p>
          </div>
        </div>
      ) : null}

      {ready && ordering.checked && !manuallyClosed ? (
        <div className={styles.status}>
          <span className={styles.sunIcon} aria-hidden>
            <FaSun />
          </span>
          <div>
            <p className={styles.statusTitle}>Ordering is open</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
