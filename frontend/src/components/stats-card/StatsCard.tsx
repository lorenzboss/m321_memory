import "./StatsCard.css";
import { UserStats } from "../../types/stats";

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
}

/* kleine, dezente Icons */
function IconWrap({ children }: { children: React.ReactNode }) {
  return <span className="stat-icon">{children}</span>;
}
const Trophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M8 4h8v3a4 4 0 1 1-8 0V4Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M12 11v4M8 19h8M9 15h6v4H9z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);
const Cross = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="m6 6 12 12M18 6 6 18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);
const Target = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
  </svg>
);
const Clock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M12 7v5l3 2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);
const Star = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="m12 2 2.9 6.1 6.7.6-5 4.5 1.5 6.6L12 16.9 5.9 19.8 7.4 13 2.4 8.7l6.7-.6L12 2Z" />
  </svg>
);
const Puzzle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M8 3h3a2 2 0 0 1 2 2v1h2v3h-1a2 2 0 1 0 0 4h1v3h-2v1a2 2 0 0 1-2 2H8v-2H6v-3H5a2 2 0 1 1 0-4h1V6h2V3Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);

function Stat({
  label,
  value,
  hint,
  icon,
  className,
  progress, // 0..100 optional (für Winrate)
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
  progress?: number;
}) {
  const pct =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, progress))
      : undefined;

  return (
    <div className={`stat ${className ?? ""}`}>
      <div className="stat-head">
        {icon ? <IconWrap>{icon}</IconWrap> : null}
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
      {typeof pct === "number" ? (
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export default function StatsCard({
  stats,
  isLoading = false,
}: {
  stats: UserStats | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <section className="pane stats-card">
        <header className="stats-header">
          <div className="stats-title">Your Stats</div>
        </header>
        <div className="stats-empty">Loading stats…</div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="pane stats-card">
        <header className="stats-header">
          <div className="stats-title">Your Stats</div>
        </header>
        <div className="stats-empty">No stats available yet.</div>
      </section>
    );
  }

  const total = stats.totalGamesPlayed || stats.wins + stats.losses;
  const winRate =
    typeof stats.winRate === "number"
      ? stats.winRate
      : total
        ? (stats.wins / total) * 100
        : 0;

  const avg =
    typeof stats.averageGameDuration === "number"
      ? stats.averageGameDuration
      : total
        ? stats.totalTimePlayed / total
        : 0;

  return (
    <section className="pane stats-card">
      <header className="stats-header">
        <div className="stats-title">Your Stats</div>
        <div className="stats-username">{stats.username}</div>
      </header>

      <div className="stats-grid stats-layout-fixed">
        {/* Zeile 1 */}
        <Stat
          className="area-wins"
          label="Wins"
          value={String(stats.wins)}
          icon={<Trophy />}
        />
        <Stat
          className="area-losses"
          label="Losses"
          value={String(stats.losses)}
          icon={<Cross />}
        />

        {/* Zeile 2 (volle Breite) */}
        <Stat
          className="area-winrate"
          label="Win rate"
          value={`${winRate.toFixed(0)}%`}
          hint={`${stats.wins}/${total} games`}
          icon={<Target />}
          progress={winRate}
        />

        {/* Zeile 3 (volle Breite) */}
        <Stat
          className="area-games"
          label="Games"
          value={String(total)}
          icon={<Puzzle />}
        />

        {/* Zeile 4 */}
        <Stat
          className="area-time"
          label="Time played"
          value={formatDuration(stats.totalTimePlayed)}
          icon={<Clock />}
        />
        <Stat
          className="area-avg"
          label="Avg. duration"
          value={formatDuration(avg)}
          icon={<Clock />}
        />

        {/* Zeile 5 */}
        <Stat
          className="area-high"
          label="Highest score"
          value={String(stats.highestScore)}
          icon={<Star />}
        />
        <Stat
          className="area-pairs"
          label="Matched pairs"
          value={String(stats.totalMatchedPairs)}
          icon={<Puzzle />}
        />
      </div>
    </section>
  );
}
