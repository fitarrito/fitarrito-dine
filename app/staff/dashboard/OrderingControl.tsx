"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaHistory, FaPowerOff, FaRegCalendarAlt, FaRegClock, FaStore } from "react-icons/fa";
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
  const [updatedDate, updatedTime] = updatedLabel?.split(", ") ?? [];

  return (
    <section
      className={offline ? styles.orderingOffline : styles.orderingLive}
      aria-busy={loading || saving}
    >
      <div className={styles.orderingMain}>
        <span className={styles.storeBadge} aria-hidden>
          <FaStore />
        </span>
        <div>
          <h2>Online Ordering</h2>
          <p className={offline ? styles.statusOffline : styles.statusLive}>
            <span className={offline ? styles.offlineDot : styles.liveDot} aria-hidden />
            {!setting
              ? "Checking status"
              : offline
                ? "OFFLINE · Not accepting orders"
                : "LIVE · Accepting orders"}
          </p>
        </div>
      </div>

      <div className={styles.orderingSchedule}>
        <p className={styles.metaLabel}>
          <FaRegCalendarAlt aria-hidden /> Auto online schedule
        </p>
        <p className={styles.metaTitle}>Every day at</p>
        <p className={styles.timePill}>
          <FaRegClock aria-hidden />
          10:00 AM
        </p>
      </div>

      <div className={styles.orderingUpdated}>
        <p className={styles.metaLabel}>
          <FaHistory aria-hidden /> Last status update
        </p>
        <p className={styles.metaRow}>
          <FaRegCalendarAlt aria-hidden />
          {updatedDate ?? "Waiting for confirmation"}
        </p>
        {updatedTime ? (
          <p className={styles.metaRow}>
            <FaRegClock aria-hidden />
            {updatedTime}
          </p>
        ) : null}
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
