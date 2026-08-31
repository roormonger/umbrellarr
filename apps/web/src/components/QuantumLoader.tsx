import { forwardRef, type HTMLAttributes } from "react";
import { Quantum } from "ldrs/react";
import "ldrs/react/Quantum.css";
import classes from "./QuantumLoader.module.css";

/** Same pixel size as Interactive Search’s Quantum. */
export const APP_LOADER_SIZE = 56;

/**
 * Mantine-compatible loader that renders LDRS Quantum.
 * Size/color come from `--loader-size` / `--loader-color` (Loader, Button, ActionIcon).
 */
export const QuantumLoader = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  function QuantumLoader({ className, style, ...others }, ref) {
    return (
      <span
        ref={ref}
        className={className ? `${classes.root} ${className}` : classes.root}
        style={style}
        {...others}
      >
        <Quantum
          size={1}
          speed={2.3}
          color="var(--loader-color, var(--mantine-color-violet-5))"
        />
      </span>
    );
  },
);
