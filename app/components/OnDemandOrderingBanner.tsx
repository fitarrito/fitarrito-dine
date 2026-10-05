"use client";

import { useEffect, useState } from "react";
import { FaLock, FaSun } from "react-icons/fa";
import { useOrderWindow } from "@lib/useOrderWindow";
import {
  getMorningOpenLabel,
  getNightCloseLabel,
} from "@lib/orderCutoff";
import styles from "./OnDemandOrderingBanner.module.css";

const DEFAULT_SUBTITLE = "Enjoy our freshly prepared Asian bowls and curries!";

type OnDemandOrderingBannerProps = {
  subtitle?: string;
};

export default function OnDemandOrderingBanner({
  subtitle = DEFAULT_SUBTITLE,
}: OnDemandOrderingBannerProps) {
  const [ready, setReady] = useState(false);
  const orderWindow = useOrderWindow();
  const morningOpen = getMorningOpenLabel();
  const nightClose = getNightCloseLabel();

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

      {ready && orderWindow === "open" ? (
        <div className={styles.status}>
          <span className={styles.sunIcon} aria-hidden>
            <FaSun />
          </span>
          <div>
            <p className={styles.statusTitle}>Ordering is open</p>
            <p className={styles.statusMessage}>
              Place your order until <strong>{nightClose}</strong>
            </p>
          </div>
        </div>
      ) : null}

      {ready && orderWindow === "closed" ? (
        <div className={styles.status}>
          <span className={styles.closedIcon} aria-hidden>
            <FaLock />
          </span>
          <div>
            <p className={styles.statusTitle}>Ordering is closed</p>
            <p className={styles.statusMessage}>
              Orders are closed from <strong>{nightClose}</strong> to{" "}
              <strong>{morningOpen}</strong>.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
