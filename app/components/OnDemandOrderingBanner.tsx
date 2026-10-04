"use client";

import { useEffect, useState } from "react";
import { FaLock, FaMoon, FaSun } from "react-icons/fa";
import { useOrderWindow } from "@lib/useOrderWindow";
import {
  getAfternoonOpenLabel,
  getDinnerCutoffLabel,
  getLunchCutoffLabel,
  getMorningOpenLabel,
  isAfternoonClosed,
  isOvernightClosed,
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
  const lunchCutoff = getLunchCutoffLabel();
  const afternoonOpen = getAfternoonOpenLabel();
  const dinnerCutoff = getDinnerCutoffLabel();
  const morningOpen = getMorningOpenLabel();

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

      {ready && orderWindow === "lunch" ? (
        <div className={styles.status}>
          <span className={styles.sunIcon} aria-hidden>
            <FaSun />
          </span>
          <div>
            <p className={styles.statusTitle}>Lunch Orders</p>
            <p className={styles.statusMessage}>
              Place your order before <strong>{lunchCutoff}</strong>
            </p>
          </div>
        </div>
      ) : null}

      {ready && orderWindow === "dinner" ? (
        <div className={styles.status}>
          <span className={styles.moonIcon} aria-hidden>
            <FaMoon />
          </span>
          <div>
            <p className={styles.statusTitle}>Dinner Orders</p>
            <p className={styles.statusMessage}>
              Open from <strong>{afternoonOpen}</strong>. Place your order before{" "}
              <strong>{dinnerCutoff}</strong>
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
              {isOvernightClosed() ? (
                <>
                  Orders are closed from <strong>{dinnerCutoff}</strong> to{" "}
                  <strong>{morningOpen}</strong>.
                </>
              ) : isAfternoonClosed() ? (
                <>
                  Ordering is closed until <strong>{afternoonOpen}</strong>.
                </>
              ) : (
                <>
                  Lunch orders close at <strong>{lunchCutoff}</strong>. Dinner
                  orders close at <strong>{dinnerCutoff}</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
