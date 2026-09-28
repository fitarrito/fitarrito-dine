"use client";

import { FaLock, FaMoon, FaSun } from "react-icons/fa";
import { useOrderWindow } from "@lib/useOrderWindow";
import { getDinnerCutoffLabel } from "@lib/orderCutoff";
import styles from "./OnDemandOrderingBanner.module.css";

export default function OnDemandOrderingBanner() {
  const orderWindow = useOrderWindow();
  const dinnerCutoff = getDinnerCutoffLabel();

  return (
    <section className={styles.banner} aria-label="On-demand ordering information">
      <div className={styles.intro}>
        <span className={styles.clockIcon} aria-hidden>
          ⏰
        </span>
        <div>
          <h2 className={styles.title}>On-Demand Ordering</h2>
          <p className={styles.subtitle}>
            Enjoy our freshly prepared Asian bowls and curries!
          </p>
        </div>
      </div>

      {orderWindow === "lunch" ? (
        <div className={styles.status}>
          <span className={styles.sunIcon} aria-hidden>
            <FaSun />
          </span>
          <div>
            <p className={styles.statusTitle}>Lunch Orders</p>
            <p className={styles.statusMessage}>
              Place your order before <strong>10:00 AM</strong>
            </p>
          </div>
        </div>
      ) : null}

      {orderWindow === "dinner" ? (
        <div className={styles.status}>
          <span className={styles.moonIcon} aria-hidden>
            <FaMoon />
          </span>
          <div>
            <p className={styles.statusTitle}>Dinner Orders</p>
            <p className={styles.statusMessage}>
              Place your order before <strong>{dinnerCutoff}</strong>
            </p>
          </div>
        </div>
      ) : null}

      {orderWindow === "closed" ? (
        <div className={styles.status}>
          <span className={styles.closedIcon} aria-hidden>
            <FaLock />
          </span>
          <div>
            <p className={styles.statusTitle}>Today&apos;s ordering is closed</p>
            <p className={styles.statusMessage}>
              Lunch orders close at <strong>10:00 AM</strong>. Dinner orders close
              at <strong>{dinnerCutoff}</strong>.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
