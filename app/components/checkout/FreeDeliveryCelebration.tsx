"use client";

import { useEffect, useRef, useState } from "react";
import { FaTruck } from "react-icons/fa";
import { FREE_DELIVERY_KM } from "@lib/deliveryFee";
import styles from "./FreeDeliveryCelebration.module.css";

const VISIBLE_MS = 4000;
const EXIT_MS = 460;

export type ConfirmedDeliveryQuote = {
  deliveryCharge: number;
  distanceKm: number;
};

type Phase = "hidden" | "enter" | "exit";

const BURST = [
  { dx: "-4.6rem", dy: "-2.1rem", color: "#FC1E1E", delay: "0.18s", size: "7px" },
  { dx: "-3.2rem", dy: "-3.1rem", color: "#ffb703", delay: "0.22s", size: "5px" },
  { dx: "3.4rem", dy: "-2.6rem", color: "#FC1E1E", delay: "0.16s", size: "6px" },
  { dx: "4.8rem", dy: "-1.2rem", color: "#ffd166", delay: "0.28s", size: "5px" },
  { dx: "-5.1rem", dy: "0.4rem", color: "#ff8a80", delay: "0.2s", size: "4px" },
  { dx: "5.2rem", dy: "0.8rem", color: "#FC1E1E", delay: "0.24s", size: "5px" },
  { dx: "-2.4rem", dy: "2.5rem", color: "#ffb703", delay: "0.3s", size: "6px" },
  { dx: "2.2rem", dy: "2.7rem", color: "#FC1E1E", delay: "0.26s", size: "4px" },
  { dx: "0.2rem", dy: "-3.4rem", color: "#fff", delay: "0.18s", size: "6px" },
  { dx: "-1.2rem", dy: "-2.6rem", color: "#FC1E1E", delay: "0.34s", size: "3px" },
  { dx: "1.4rem", dy: "-2.2rem", color: "#ffd166", delay: "0.32s", size: "4px" },
  { dx: "0rem", dy: "3rem", color: "#ff8a80", delay: "0.28s", size: "5px" },
] as const;

function isConfirmedFreeDelivery(quote: ConfirmedDeliveryQuote | null) {
  if (!quote) return false;

  return (
    quote.deliveryCharge === 0 &&
    Number.isFinite(quote.distanceKm) &&
    quote.distanceKm >= 0 &&
    quote.distanceKm <= FREE_DELIVERY_KM
  );
}

export default function FreeDeliveryCelebration({
  quote,
  quoteFailed,
}: {
  quote: ConfirmedDeliveryQuote | null;
  quoteFailed: boolean;
}) {
  const qualification = useRef<"free" | "other">("other");
  const generation = useRef(0);
  const dwellTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [burstId, setBurstId] = useState(0);

  const dismiss = () => {
    generation.current += 1;

    if (dwellTimer.current) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }

    setPhase((current) => (current === "enter" ? "exit" : current));
  };

  useEffect(() => {
    if (isConfirmedFreeDelivery(quote)) {
      if (qualification.current === "free") return;

      qualification.current = "free";
      generation.current += 1;
      const ticket = generation.current;
      setBurstId((current) => current + 1);
      setPhase("enter");

      if (dwellTimer.current) window.clearTimeout(dwellTimer.current);

      dwellTimer.current = window.setTimeout(() => {
        if (generation.current === ticket) setPhase("exit");
      }, VISIBLE_MS);
      return;
    }

    if (quote) {
      qualification.current = "other";
      dismiss();
      return;
    }

    if (quoteFailed) qualification.current = "other";

    dismiss();
  }, [quote, quoteFailed]);

  useEffect(() => {
    if (phase !== "exit") return;

    const timer = window.setTimeout(() => setPhase("hidden"), EXIT_MS);

    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(
    () => () => {
      if (dwellTimer.current) window.clearTimeout(dwellTimer.current);
    },
    [],
  );

  if (phase === "hidden") return null;

  return (
    <div className={styles.anchor}>
      <div
        className={`${styles.banner} ${phase === "enter" ? styles.enter : styles.exit}`}
        role="status"
        data-free-delivery-celebration=""
      >
        <span className={styles.burst} key={burstId} aria-hidden>
          {BURST.map((particle) => (
            <span
              key={`${particle.dx}-${particle.dy}`}
              className={styles.particle}
              style={{
                ["--dx" as string]: particle.dx,
                ["--dy" as string]: particle.dy,
                ["--color" as string]: particle.color,
                ["--delay" as string]: particle.delay,
                ["--size" as string]: particle.size,
              }}
            />
          ))}
        </span>
        <span className={styles.icon} aria-hidden>
          <FaTruck />
        </span>
        <span className={styles.copy}>
          <span className={styles.kicker}>Congratulations!</span>
          <strong className={styles.headline}>FREE DELIVERY</strong>
          <span className={styles.support}>Your delivery is on us!</span>
        </span>
      </div>
    </div>
  );
}
