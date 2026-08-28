"use client";

import React from "react";
import clsx from "clsx";
import styles from "./Card.module.css";

interface CardProps {
  primaryText: string;
  secondaryText?: string;
  variant?: "light" | "dark"; // kept for compatibility
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  primaryText,
  secondaryText,
  icon,
  className,
  onClick,
}) => {
  return (
    <div
      className={clsx(styles.card, onClick && styles.clickable, className)}
      onClick={onClick}
    >
      {icon && <div className={styles.iconContainer}>{icon}</div>}

      <div className={styles.primaryText}>{primaryText}</div>

      {secondaryText && (
        <div className={styles.secondaryText}>{secondaryText}</div>
      )}
    </div>
  );
};

export default Card;
