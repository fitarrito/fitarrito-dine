import Image from "next/image";
import Link from "next/link";
import {
  FaLeaf,
  FaHeart,
  FaShoppingBasket,
  FaClock,
  FaUtensils,
  FaCalendarCheck,
  FaFire,
  FaCheckCircle,
  FaArrowRight,
} from "react-icons/fa";
import styles from "./subscription.module.css";

const HERO_IMAGES = [
  { src: "/images/menuimages/StirFryVeggiesBowl.svg", alt: "Veg bowl" },
  { src: "/images/menuimages/QuinoaBowl.svg", alt: "Quinoa bowl", center: true },
  { src: "/images/menuimages/ChickenHummusBowl.svg", alt: "Chicken bowl" },
];

const WHY_SUBSCRIBE = [
  { icon: FaClock, text: "5 delicious meals every week" },
  { icon: FaUtensils, text: "Different cuisine every day" },
  { icon: FaCalendarCheck, text: "No daily meal planning" },
  { icon: FaFire, text: "Freshly prepared" },
  { icon: FaCheckCircle, text: "Saves time & effort" },
  { icon: FaLeaf, text: "Healthy & satisfying" },
];

export default function SubscriptionLanding() {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.pageInner}>
          <section className={styles.hero}>
            <div className={styles.heroImages} aria-hidden>
              {HERO_IMAGES.map((image) => (
                <div
                  key={image.src}
                  className={`${styles.heroImageWrap} ${
                    image.center ? styles.heroImageWrapCenter : ""
                  }`}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className={styles.heroImage}
                    sizes="(max-width: 640px) 32vw, (max-width: 1024px) 28vw, 280px"
                  />
                </div>
              ))}
            </div>

            <h1 className={styles.heroTitle}>Eat Better Every Day!</h1>
            <p className={styles.planLabel}>5-DAY MEAL PLAN</p>
            <p className={styles.planSubLabel}>LUNCH + DINNER</p>
            <p className={styles.planMeta}>
              10 MEALS • 5 DAYS • 5 DIFFERENT FLAVOURS
            </p>

            <div className={styles.features}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>
                  <FaLeaf aria-hidden />
                </span>
                <span className={styles.featureLabel}>Wholesome ingredients</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>
                  <FaShoppingBasket aria-hidden />
                </span>
                <span className={styles.featureLabel}>Freshly prepared</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>
                  <FaHeart aria-hidden />
                </span>
                <span className={styles.featureLabel}>Made with love</span>
              </div>
            </div>
          </section>

          <section className={styles.whySection}>
            <h2 className={styles.whyTitle}>Why Subscribe?</h2>
            <ul className={styles.whyGrid}>
              {WHY_SUBSCRIBE.map(({ icon: Icon, text }) => (
                <li key={text} className={styles.whyItem}>
                  <span className={styles.whyIcon}>
                    <Icon aria-hidden />
                  </span>
                  <p className={styles.whyText}>{text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className={styles.landingContinueBar}>
        <Link href="/subscription?step=plan" className={styles.landingContinueBtn}>
          Continue
          <FaArrowRight aria-hidden />
        </Link>
      </div>
    </>
  );
}
