import { ALPHABET_KEYS, type AlphabetKey } from "@/lib/alphabet";
import classes from "./AlphabetJumper.module.css";

export function AlphabetJumper({
  available,
  active,
  onJump,
}: {
  available: ReadonlySet<string>;
  active?: string;
  onJump: (letter: AlphabetKey) => void;
}) {
  return (
    <nav className={classes.rail} aria-label="Jump to letter">
      {ALPHABET_KEYS.map((letter) => {
        const enabled = available.has(letter);
        return (
          <button
            key={letter}
            type="button"
            className={classes.letter}
            data-active={active === letter || undefined}
            disabled={!enabled}
            onClick={() => onJump(letter)}
            aria-label={`Jump to ${letter === "#" ? "numbers and symbols" : letter}`}
          >
            {letter}
          </button>
        );
      })}
    </nav>
  );
}
