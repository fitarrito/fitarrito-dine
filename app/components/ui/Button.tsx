"use client";

import styles from "./Button.module.css";
import clsx from "clsx";
import React from "react";

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
};

export default function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className,
  onClick,
  disabled = false,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        styles.button, // base style
        styles[variant], // primary / secondary / outline
        fullWidth && styles.fullWidth,
        className,
      )}
    >
      {children}
    </button>
  );
}
