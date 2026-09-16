import timeline from "../timeline.json";

/** One chapter of the walkthrough: where it starts in the recording and what the caption says. */
export interface Chapter {
  key: string;
  /** Seconds into the recording. */
  at: number;
  title: string;
  caption: string;
}

export interface Timeline {
  /** Length of the recording in seconds. */
  duration: number;
  /** Recording size in pixels. */
  width: number;
  height: number;
  marks: { key: string; at: number }[];
}

/** What each mark from capture.mjs means on screen (title in the top bar, caption below the window). */
export const CHAPTER_COPY: Record<string, { title: string; caption: string }> = {
  signup: { title: "Sign up", caption: "One form: name, email, password. Then XPMatch asks how you travel." },
  onboarding: { title: "Six short steps", caption: "About you · style & interests · stays · food · logistics & next trip · dealbreakers. Everything is optional and editable later." },
  interests: { title: "Things you love doing", caption: "Museums, food markets, nightlife, hikes… these drive the picks and every itinerary." },
  stays: { title: "Where you stay", caption: "The kind of place, plus must-haves like a pool or a quiet room." },
  food: { title: "How you eat", caption: "Cuisines, dietary needs and how adventurous you are." },
  logistics: { title: "Logistics and the next trip", caption: "Your rhythm, walking, transport, flights, and where you are dreaming of going." },
  dealbreakers: { title: "What ruins a trip", caption: "Dealbreakers are checked against every recommendation." },
  home: { title: "For you in Rome", caption: "Three things to do, three stays, three places to eat, built from your profile through Google Places." },
  score: { title: "Why this score", caption: "Every pick carries a match score with the reasons behind it, and thumbs so it learns." },
  chat: { title: "Ask for a plan", caption: "“Plan a trip to Rome for two of us in October.”" },
  proposal: { title: "A trip proposal", caption: "Every stop is a real place, resolved and pinned on the map with photos, ratings and a match score before you save." },
  board: { title: "The board", caption: "Days as lists of stops with travel times from Google, by walk, drive or transit." },
  details: { title: "Stop details", caption: "Photos, hours, links, the match score and “Ask about it” without leaving the board." },
  reservation: { title: "Paste a confirmation", caption: "Emails, PDFs and screenshots become bookings with the confirmation code and dates." },
  bookings: { title: "Bookings on the trip", caption: "The booking sits under Bookings and on the board on the day it starts." },
  bug: { title: "Report a bug", caption: "Testers report problems in place; the team sees them under Admin with the page and a screenshot." },
};

export const TIMELINE = timeline as Timeline;

export const FPS = 30;
export const INTRO_FRAMES = 90;
export const OUTRO_FRAMES = 120;

export function chapters(): Chapter[] {
  return TIMELINE.marks
    .filter((m) => CHAPTER_COPY[m.key])
    .map((m) => ({ key: m.key, at: m.at, ...CHAPTER_COPY[m.key] }));
}

export function totalFrames(): number {
  return INTRO_FRAMES + Math.ceil(TIMELINE.duration * FPS) + OUTRO_FRAMES;
}
