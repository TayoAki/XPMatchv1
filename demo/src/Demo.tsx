import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { chapters, FPS, INTRO_FRAMES, OUTRO_FRAMES, TIMELINE } from "./timeline";

const FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const INK = "#111111";
const MUTED = "#6b6b6b";
const PAPER = "#f6f5f2";

function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3, fontFamily: FONT, fontWeight: 800, fontSize: size, color: INK, letterSpacing: -1 }}>
      <svg width={size * 0.9} height={size * 0.9} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M5.6 18.4l2.2-2.2M16.2 7.8l2.2-2.2" />
      </svg>
      xpmatch.
    </div>
  );
}

function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 } });
  const fade = interpolate(frame, [INTRO_FRAMES - 20, INTRO_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sub = interpolate(frame, [18, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: "center", justifyContent: "center", opacity: fade }}>
      <div style={{ transform: `translateY(${(1 - rise) * 40}px)`, textAlign: "center" }}>
        <Wordmark size={96} />
        <div style={{ marginTop: 28, fontFamily: FONT, fontSize: 44, fontWeight: 600, color: INK, opacity: sub }}>A travel planner that knows how you travel.</div>
        <div style={{ marginTop: 14, fontFamily: FONT, fontSize: 26, color: MUTED, opacity: sub }}>From a six-step profile to a bookable trip, in one walkthrough.</div>
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 } });
  const items = ["Deep profile → home picks", "Match score + thumbs on every pick", "Trip proposal with real places", "Board with travel times and stop details", "Confirmations become bookings", "Bug reports straight to the team"];
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `translateY(${(1 - rise) * 40}px)`, textAlign: "center", maxWidth: 1400 }}>
        <Wordmark size={80} />
        <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
          {items.map((item, i) => {
            const on = interpolate(frame, [10 + i * 6, 22 + i * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={item} style={{ opacity: on, fontFamily: FONT, fontSize: 26, fontWeight: 600, color: INK, background: "#fff", border: "1px solid #e4e2dd", borderRadius: 999, padding: "12px 24px" }}>
                {item}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 34, fontFamily: FONT, fontSize: 28, color: MUTED }}>Beta · xpmatch-production.up.railway.app</div>
      </div>
    </AbsoluteFill>
  );
}

/** The recording inside a window frame, with the chapter title above and its caption below. */
function Walkthrough() {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  const list = chapters();
  const index = Math.max(0, list.findIndex((c, i) => seconds >= c.at && (i === list.length - 1 || seconds < list[i + 1].at)));
  const current = list[index];
  const since = current ? seconds - current.at : 0;
  const captionIn = interpolate(since, [0, 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fit the recording into the window: 1440×900 → 1600×1000 leaves room for the title bar and caption.
  const targetWidth = 1600;
  const scale = targetWidth / TIMELINE.width;
  const videoHeight = TIMELINE.height * scale;

  return (
    <AbsoluteFill style={{ background: PAPER, opacity: fadeIn }}>
      <div style={{ position: "absolute", top: 34, left: 160, right: 160, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark size={34} />
        <div style={{ display: "flex", gap: 8 }}>
          {list.map((c, i) => (
            <div key={c.key} style={{ width: i === index ? 34 : 12, height: 12, borderRadius: 999, background: i <= index ? INK : "#d9d6cf", transition: "width 0.2s" }} />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", top: 84, left: 160, width: targetWidth, height: videoHeight + 44, borderRadius: 22, background: "#fff", boxShadow: "0 30px 80px rgba(0,0,0,0.18)", overflow: "hidden", border: "1px solid #e4e2dd" }}>
        <div style={{ height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 18px", background: "#f2f0ec", borderBottom: "1px solid #e4e2dd" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: 999, background: c }} />
          ))}
          <div style={{ marginLeft: 16, fontFamily: FONT, fontSize: 16, color: MUTED }}>{current ? current.title : "XPMatch"}</div>
        </div>
        <div style={{ width: TIMELINE.width, height: TIMELINE.height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <OffthreadVideo src={staticFile("walkthrough.webm")} muted style={{ width: TIMELINE.width, height: TIMELINE.height }} />
        </div>
      </div>
      {current ? (
        <div style={{ position: "absolute", left: 160, right: 160, bottom: 30, opacity: captionIn, transform: `translateY(${(1 - captionIn) * 10}px)` }}>
          <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: INK }}>{current.title}</div>
          <div style={{ fontFamily: FONT, fontSize: 24, color: MUTED, marginTop: 4, lineHeight: 1.35 }}>{current.caption}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

export const Demo = () => {
  const clipFrames = Math.ceil(TIMELINE.duration * FPS);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <Intro />
      </Sequence>
      <Sequence from={INTRO_FRAMES} durationInFrames={clipFrames}>
        <Walkthrough />
      </Sequence>
      <Sequence from={INTRO_FRAMES + clipFrames} durationInFrames={OUTRO_FRAMES}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
