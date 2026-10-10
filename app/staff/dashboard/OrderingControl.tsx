"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaClock, FaPowerOff, FaStore } from "react-icons/fa";
import { fetchJson } from "@lib/apiFetch";
import { formatKolkataDateTime } from "@lib/onlineOrdering";
import styles from "./dashboard.module.css";

type StoreSetting = {
  id: number;
  online_ordering_enabled: boolean;
  updated_at: string | null;
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

const POLL_MS = 15_000;

export default function OrderingControl() {
  const [setting, setSetting] = useState<StoreSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const requestRef = useRef(0);
  const savingRef = useRef(false);

  const loadSetting = useCallback(async () => {
    const requestId = requestRef.current;
    const result = await fetchJson<{ setting: StoreSetting }>("/api/staff/ordering");

    if (requestId !== requestRef.current) return;

    if (typeof result.setting?.online_ordering_enabled !== "boolean") {
      throw new Error("Online ordering status could not be confirmed.");
    }

    setSetting(result.setting);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refresh = (announceError: boolean) => {
      if (savingRef.current) return;

      loadSetting().catch((error) => {
        if (cancelled) return;
        setLoading(false);

        if (!announceError) return;

        setNotice({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Unable to load online ordering status.",
        });
      });
    };

    refresh(true);

    const intervalId = window.setInterval(() => refresh(false), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh(false);
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadSetting]);

  const save = async (enabled: boolean) => {
    if (savingRef.current || loading || !setting || setting.online_ordering_enabled === enabled) {
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    savingRef.current = true;
    setSaving(true);
    setNotice(null);

    try {
      const result = await fetchJson<{ setting: StoreSetting }>("/api/staff/ordering", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const confirmed = result.setting;

      if (
        requestId !== requestRef.current ||
        !confirmed ||
        confirmed.online_ordering_enabled !== enabled ||
        confirmed.id !== 1
      ) {
        throw new Error("Online ordering status could not be confirmed.");
      }

      setSetting(confirmed);
      setNotice({
        tone: "success",
        text: enabled
          ? "Online ordering is now live."
          : "Online ordering is now offline.",
      });
    } catch (error) {
      if (requestId !== requestRef.current) return;

      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update online ordering.",
      });
    } finally {
      if (requestId === requestRef.current) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  };

  const live = setting?.online_ordering_enabled === true;
  const offline = setting?.online_ordering_enabled === false;
  const busy = loading || saving || !setting;
  const updatedLabel = formatKolkataDateTime(setting?.updated_at ?? null);

  return (
    <section
      className={offline ? styles.orderingOffline : styles.orderingLive}
      aria-busy={loading || saving}
    >
      <div className={styles.orderingMain}>
        <span className={styles.storeBadge} aria-hidden>
          <FaStore />
          <span className={offline ? styles.offlineDot : styles.liveDot} />
        </span>
        <div>
          <h2>
            {!setting ? (
              "Checking online ordering"
            ) : offline ? (
              <>
                Online Ordering is <span className={styles.offlineWord}>OFFLINE</span>
              </>
            ) : (
              <>
                Online Ordering is <span className={styles.liveWord}>LIVE</span>
              </>
            )}
          </h2>
          {!setting ? <p>Loading the current ordering status.</p> : null}
        </div>
      </div>

      <div className={styles.orderingSchedule}>
        <p className={styles.scheduleLine}>
          <FaClock aria-hidden /> Automatically goes online every day at 10:00{"\u00A0"}AM
        </p>
        <p className={styles.updatedLabel}>Last updated</p>
        <p className={styles.updatedTime}>{updatedLabel ?? "Waiting for confirmation"}</p>
      </div>

      <div className={styles.orderingActions}>
        <button
          type="button"
          className={live ? styles.switchOn : styles.switchOff}
          role="switch"
          aria-checked={live}
          aria-label={live ? "Online ordering is live" : "Online ordering is offline"}
          disabled={busy}
          onClick={() => void save(!live)}
        >
          <span />
        </button>
        <button
          type="button"
          className={offline ? styles.goOnline : styles.goOffline}
          disabled={busy}
          onClick={() => void save(!live)}
        >
          <FaPowerOff aria-hidden />
          {saving ? "Saving..." : offline ? "Go Online" : "Go Offline"}
        </button>
      </div>

      {notice ? (
        <p
          className={
            notice.tone === "success" ? styles.orderingSuccess : styles.orderingError
          }
          role="status"
        >
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}
