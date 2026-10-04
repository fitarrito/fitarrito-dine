import { MEXICAN_MINI_OFFER_PRICE, MEXICAN_MINI_OFFER_RANGE_LABEL } from "@lib/mexicanMiniOffer";
import styles from "./MexicanMiniOfferBanner.module.css";

export default function MexicanMiniOfferBanner() {
  return (
    <section className={styles.banner} aria-label="Mexican mini launching offer">
      <div className={styles.posterFrame}>
        <img
          src="/images/mexican-menu-launch-offer.jpg"
          alt="Launching offer: all Mexican menu mini size variants at ₹99, only for 3 days, 5–7 Oct 2026"
          width={1024}
          height={349}
          className={styles.poster}
        />
      </div>

      <div className={styles.note}>
        <div className={styles.noteLead}>
          <p className={styles.noteTitle}>Mini Size</p>
          <p className={styles.noteBadge}>Launching Offer</p>
        </div>
        <p className={styles.noteCopy}>
          All Mexican menu mini size variants at ₹{MEXICAN_MINI_OFFER_PRICE} only!
        </p>
        <p className={styles.noteDates}>Valid from {MEXICAN_MINI_OFFER_RANGE_LABEL}</p>
      </div>
    </section>
  );
}
