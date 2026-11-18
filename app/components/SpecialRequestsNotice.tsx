import styles from "./SpecialRequestsNotice.module.css";

export default function SpecialRequestsNotice({
  value,
}: {
  value?: string | null;
}) {
  const text = value?.trim();

  if (!text) return null;

  return (
    <section className={styles.note}>
      <span>FOOD ALLERGIES &amp; SPECIAL REQUESTS</span>
      <p>{text}</p>
    </section>
  );
}
