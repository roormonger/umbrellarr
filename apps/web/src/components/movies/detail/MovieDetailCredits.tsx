import { Text } from "@mantine/core";
import type { MovieCredit } from "@umbrellarr/shared";
import classes from "./MovieDetailCredits.module.css";
import panel from "./MovieDetailPanel.module.css";

function CreditScroller({ title, credits }: { title: string; credits: MovieCredit[] }) {
  if (credits.length === 0) return null;

  return (
    <section className={panel.panel}>
      <Text className={panel.heading}>{title}</Text>
      <div className={classes.scroller}>
        {credits.map((credit) => (
          <div key={credit.id} className={classes.card}>
            <div className={classes.headshot}>
              {credit.headshotUrl ? (
                <img src={credit.headshotUrl} alt="" loading="lazy" />
              ) : null}
            </div>
            <div className={classes.name}>{credit.personName}</div>
            <div className={classes.role}>
              {credit.type === "cast" ? credit.character || "—" : credit.job || "—"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MovieDetailCredits({
  cast,
  crew,
}: {
  cast: MovieCredit[];
  crew: MovieCredit[];
}) {
  if (cast.length === 0 && crew.length === 0) return null;

  return (
    <>
      <CreditScroller title="Cast" credits={cast} />
      <CreditScroller title="Crew" credits={crew} />
    </>
  );
}
