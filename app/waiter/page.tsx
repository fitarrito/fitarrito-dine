import type { Metadata } from "next";
import Image from "next/image";
import logo from "../../public/images/logo.svg";
import wordmark from "../../public/images/fitarrito.svg";
import styles from "./waiter.module.css";

export const metadata: Metadata = {
  title: "Waiter Portal",
  description: "Manage your table orders",
};

export default function WaiterPage() {
  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Image
            className={styles.logo}
            src={logo}
            alt="Fitarrito logo"
            width={55}
            height={55}
            priority
          />
          <Image
            className={styles.wordmark}
            src={wordmark}
            alt="Fitarrito"
            width={130}
            height={40}
            priority
          />
        </div>
        <h1>Waiter Portal</h1>
        <p className={styles.subtitle}>Manage your table orders</p>
        <p className={styles.placeholder}>Waiter ordering will be available here.</p>
      </div>
    </section>
  );
}
