import { describe, expect, it } from "vitest";
import type { PlaceFacts } from "@/lib/places/facts";
import { attributesFrom, detectTopics, findEvidence, relativeDays, splitSentences, topicCounts } from "@/lib/places/evidence";
import { answerPlaceQuestion, questionGuard } from "@/server/answer";

const facts: PlaceFacts = {
  placeId: "hotel-de-russie",
  kind: "hotel",
  name: "Hotel de Russie",
  fetchedAt: new Date().toISOString(),
  reviewSummary: "Guests praise the garden courtyard and the location; rooms facing the piazza can be noisy at night.",
  reviews: [
    { author: "Marta L.", rating: 5, relativeTime: "2 months ago", text: "The secret garden is magical and breakfast on the terrace was the highlight of our stay. Very quiet at night in the garden-side rooms." },
    { author: "James K.", rating: 4, relativeTime: "2 months ago", text: "Beautiful hotel, impeccable service. Our room faced the piazza and traffic noise kept us up until late, so ask for the courtyard side." },
    { author: "Sofia R.", rating: 5, relativeTime: "3 weeks ago", text: "The spa is excellent and the staff remembered our names. Expensive, but worth it for a special occasion." },
    { author: "Daniel P.", rating: 3, relativeTime: "5 months ago", text: "Lovely building but the room was small for the price and the wifi dropped during my work calls." },
    { author: "Aiko T.", rating: 5, relativeTime: "1 month ago", text: "Perfect location, ten minutes on foot to the Spanish Steps and Villa Borghese. Dog-friendly too, they brought a bowl for our pup." },
  ],
  attributes: [
    { key: "allowsDogs", label: "Allows dogs", value: true },
    { key: "goodForChildren", label: "Good for children", value: true },
    { key: "accessibilityOptions.wheelchairAccessibleEntrance", label: "Wheelchair-accessible entrance", value: true },
  ],
};

describe("detectTopics", () => {
  it("maps question phrasings to topics", () => {
    expect(detectTopics("Is it quiet at night?")).toEqual(["noise"]);
    expect(detectTopics("Do they allow dogs?")).toEqual(["pets"]);
    expect(detectTopics("Is there a desk to work at?")).toEqual(["workspace"]);
    expect(detectTopics("Can I bring my kids?")).toEqual(["family"]);
  });
});

describe("findEvidence", () => {
  it("returns the noise sentences with the right review indices", () => {
    const evidence = findEvidence(facts, "Is it quiet at night?");
    const idx = evidence.snippets.map((s) => s.reviewIndex);
    expect(idx).toContain(0);
    expect(idx).toContain(1);
    expect(evidence.snippets[0].sentence).toMatch(/quiet at night|traffic noise/);
    expect(evidence.summaryHits[0]).toMatch(/noisy at night/);
    expect(evidence.attributes).toEqual([]);
  });

  it("answers attribute questions from attributes and matching reviews", () => {
    const evidence = findEvidence(facts, "Do they allow dogs?");
    expect(evidence.attributes.map((a) => a.key)).toEqual(["allowsDogs"]);
    expect(evidence.snippets.some((s) => s.reviewIndex === 4)).toBe(true);
  });

  it("finds nothing for a topic the reviews do not cover", () => {
    const evidence = findEvidence(facts, "Is there parking?");
    expect(evidence.snippets).toEqual([]);
    expect(evidence.attributes).toEqual([]);
    expect(evidence.summaryHits).toEqual([]);
  });

  it("counts reviews per topic", () => {
    const counts = topicCounts(facts.reviews);
    expect(counts.noise).toBe(2);
    // "impeccable service", "staff remembered" and "Dog-friendly" (friendly) all count.
    expect(counts.service).toBe(3);
    expect(counts.pets).toBe(1);
  });
});

describe("helpers", () => {
  it("splits sentences and parses relative times", () => {
    expect(splitSentences("One. Two! Three? four")).toEqual(["One.", "Two!", "Three? four"]);
    expect(relativeDays("3 weeks ago")).toBe(21);
    expect(relativeDays("a month ago")).toBe(30);
    expect(relativeDays(undefined)).toBeGreaterThan(1000);
  });

  it("flattens Places attribute fields", () => {
    const attrs = attributesFrom({ allowsDogs: true, accessibilityOptions: { wheelchairAccessibleEntrance: false }, rating: 4.5 });
    expect(attrs).toEqual([
      { key: "allowsDogs", label: "Allows dogs", value: true },
      { key: "accessibilityOptions.wheelchairAccessibleEntrance", label: "Wheelchair-accessible entrance", value: false },
    ]);
  });

  it("guards personal and empty questions", () => {
    expect(questionGuard("Is it quiet?")).toBeNull();
    expect(questionGuard("")).toMatch(/Ask a question/);
    expect(questionGuard("What is the owner's phone number of the place")).toMatch(/people who work/);
  });
});

describe("answerPlaceQuestion without a model", () => {
  it("composes a template answer with refs from the evidence", async () => {
    const answer = await answerPlaceQuestion(facts, "Is it quiet at night?", null);
    expect(answer.confidence).toBe("clear");
    expect(answer.answer).toMatch(/review summary says/);
    expect(answer.refs.some((r) => r.type === "review")).toBe(true);
    expect(answer.basis).toMatch(/5 recent Google reviews/);
  });

  it("says so when nothing supports an answer", async () => {
    const answer = await answerPlaceQuestion(facts, "Is there parking?", null);
    expect(answer.confidence).toBe("none");
    expect(answer.answer).toMatch(/don't mention this/);
    expect(answer.refs).toEqual([]);
  });

  it("uses attributes when they settle the question", async () => {
    const answer = await answerPlaceQuestion(facts, "Do they allow dogs?", null);
    expect(answer.answer).toMatch(/Google lists allows dogs/);
    expect(answer.confidence).toBe("clear");
  });
});
