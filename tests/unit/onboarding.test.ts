import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/types";
import { QUIZ, QUIZ_QUESTIONS, answersSummary, applyRecordedAnswers, matchOption, ownWords, sectionOf, type QuizField } from "@/lib/onboarding/quiz";
import { INTERVIEW_MODEL, interviewInstruction, interviewTools, type InterviewContext } from "@/lib/onboarding/interview";
import { countryCode, countryFlag } from "@/lib/places/flags";
import { CUISINES, INTERESTS, STAY_TYPES, describePlace, offered } from "@/lib/profile/options";

const question = (field: QuizField) => QUIZ_QUESTIONS.find((q) => q.field === field)!;
const labels = (field: QuizField) => question(field).options.map((o) => o.label);

describe("the onboarding quiz", () => {
  it("asks four sections, in order, with the questions and choices given", () => {
    expect(QUIZ.map((s) => s.title)).toEqual(["Tell me a bit about your travel style.", "Let’s go a little deeper on how you stay.", "Share a bit about your food preferences", "Wrapping up"]);
    expect(QUIZ.map((s) => s.questions.map((q) => q.field))).toEqual([
      ["companions", "budgetTier", "splurges"],
      ["stayTypes", "loyaltyPrograms"],
      ["cuisines", "dietaryTags"],
      ["interests", "notes"],
    ]);
    expect(labels("companions")).toEqual(["Solo", "Couple", "Family", "Friends"]);
    expect(question("budgetTier").options.map((o) => `${o.sign} ${o.label}`)).toEqual(["$ On a budget", "$$ Sensibly priced", "$$$ Upscale", "$$$$ Luxury"]);
    expect(labels("splurges")).toEqual(["Stay", "Restaurants", "Experiences"]);
    expect(labels("stayTypes")).toHaveLength(11);
    expect(labels("loyaltyPrograms")).toEqual([
      "Marriott Bonvoy",
      "Hilton Honors",
      "World of Hyatt",
      "IHG One Rewards",
      "Wyndham Rewards",
      "Choice Privileges",
      "Accor Live Limitless (ALL)",
      "Best Western Rewards",
      "GHA Discovery",
    ]);
    expect(labels("cuisines")).toHaveLength(12);
    expect(labels("dietaryTags")).toEqual(["Gluten-free", "Dairy-free", "Vegetarian", "Vegan", "Pescatarian", "Halal", "Kosher"]);
    expect(labels("interests")).toHaveLength(10);
    // Every list but the single choices offers "Other".
    expect(QUIZ_QUESTIONS.filter((q) => q.other).map((q) => q.field)).toEqual(["splurges", "stayTypes", "loyaltyPrograms", "cuisines", "dietaryTags", "interests"]);
    expect(sectionOf("loyaltyPrograms")).toBe("stays");
  });

  it("maps what people say to the choices", () => {
    expect(matchOption(question("companions"), "Couple")?.value).toBe("partner");
    expect(matchOption(question("companions"), "partner")?.value).toBe("partner");
    expect(matchOption(question("companions"), "usually with my wife")?.value).toBe("partner");
    expect(matchOption(question("companions"), "by myself")?.value).toBe("solo");
    expect(matchOption(question("budgetTier"), "upscale")?.value).toBe("premium");
    expect(matchOption(question("budgetTier"), "pretty fancy")?.value).toBe("premium");
    expect(matchOption(question("stayTypes"), "Airbnb")?.value).toBe("Short-term rentals");
    expect(matchOption(question("stayTypes"), "boutique")?.value).toBe("Boutique hotels");
    expect(matchOption(question("cuisines"), "street food")?.value).toBe("Local street food");
    expect(matchOption(question("dietaryTags"), "I'm celiac")?.value).toBe("Gluten-free");
    expect(matchOption(question("interests"), "hiking")?.value).toBe("Outdoors");
    expect(matchOption(question("companions"), "a llama")).toBeNull();
  });

  it("applies what the interview recorded: single answers must match, lists replace and keep own words", () => {
    const { profile, changed } = applyRecordedAnswers(DEFAULT_PROFILE, {
      companions: "with my wife",
      budget: "Upscale",
      splurges: ["Restaurants", "spa days"],
      accommodation: "boutique hotels and Airbnb",
      loyalty: ["Hilton Honors", "hilton honors"],
      weekends: ["hiking", "Live music"],
      notes: "  Allergic to cats.  ",
      favouriteColour: "blue",
    });
    expect(changed).toEqual(["companions", "budgetTier", "splurges", "stayTypes", "loyaltyPrograms", "interests", "notes"]);
    expect(profile).toMatchObject({
      companions: "partner",
      budgetTier: "premium",
      splurges: ["Restaurants", "Spa days"],
      stayTypes: ["Boutique hotels", "Short-term rentals"],
      loyaltyPrograms: ["Hilton Honors"],
      interests: ["Outdoors", "Live music"],
      notes: "Allergic to cats.",
    });
    // A single answer that names no choice changes nothing; a list replaces the earlier one.
    expect(applyRecordedAnswers(profile, { companions: "a llama" }).changed).toEqual([]);
    expect(applyRecordedAnswers(profile, { weekends: ["Shopping"] }).profile.interests).toEqual(["Shopping"]);
    // Lists keep at most twelve answers.
    expect(applyRecordedAnswers(profile, { weekends: Array.from({ length: 20 }, (_, i) => `hobby ${i}`) }).profile.interests).toHaveLength(12);
  });

  it("answers the tool in the quiz's words", () => {
    const { profile } = applyRecordedAnswers(DEFAULT_PROFILE, { companions: "Couple", budget: "Luxury", restaurants: ["Food trucks", "ramen bars"] });
    expect(answersSummary(profile, ["companions", "budgetTier", "cuisines"])).toEqual({ companions: "Couple", budget: "Luxury", restaurants: ["Food trucks", "Ramen bars"] });
  });

  it("tidies answers in the traveler's own words", () => {
    expect(ownWords("  wine   tastings ")).toBe("Wine tastings");
    expect(ownWords("x".repeat(80))).toHaveLength(40);
  });
});

describe("the voice interview", () => {
  const ctx: InterviewContext = {
    firstName: "Taco",
    homeCity: "Atlanta, GA, USA",
    personality: "professional",
    placesBeen: ["Lisbon, Portugal"],
    placesWant: ["Kyoto, Japan"],
    trip: "Where: Tokyo, Japan.",
    answered: "",
  };

  it("runs on the stable Live model", () => {
    expect(INTERVIEW_MODEL).toBe("gemini-3.8-live");
  });

  it("declares its tools from the quiz itself", () => {
    const [{ functionDeclarations }] = interviewTools();
    expect(functionDeclarations.map((f) => f.name)).toEqual(["record_answers", "show_section", "finish_interview"]);
    const record = functionDeclarations[0].parameters.properties as Record<string, { type: string; enum?: string[]; items?: unknown }>;
    expect(Object.keys(record)).toEqual(QUIZ_QUESTIONS.map((q) => q.arg));
    expect(record.companions).toMatchObject({ type: "STRING", enum: ["Solo", "Couple", "Family", "Friends"] });
    expect(record.accommodation).toMatchObject({ type: "ARRAY", items: { type: "STRING" } });
    expect(record.notes.type).toBe("STRING");
    const show = functionDeclarations[1].parameters.properties as Record<string, { enum?: string[] }>;
    expect(show.section.enum).toEqual(["style", "stays", "food", "wrap"]);
  });

  it("tells the model who it is talking to, in which tone, and what never to ask", () => {
    const text = interviewInstruction(ctx);
    for (const expected of ["Taco", "They live in Atlanta, GA, USA.", "Lisbon, Portugal", "Kyoto, Japan", "Trip in mind: Where: Tokyo, Japan.", "Speak professionally", "Competent and efficient"]) {
      expect(text).toContain(expected);
    }
    expect(text).toContain("never ask for personal details");
    expect(text).toContain('call show_section with "style"');
    expect(text).toContain("call finish_interview");
  });

  it("picks up where an earlier interview stopped", () => {
    const text = interviewInstruction({ ...ctx, answered: "companions: Couple; budget: Upscale" });
    expect(text).toContain("Already answered on screen");
    expect(text).toContain("companions: Couple; budget: Upscale");
    expect(text).toContain("welcoming Taco back");
    expect(text).not.toContain('call show_section with "style" and ask who');
  });
});

describe("place flags", () => {
  it("reads the country at the end of a place line", () => {
    expect(countryCode("Tokyo, Japan")).toBe("JP");
    expect(countryCode("Atlanta, GA, USA")).toBe("US");
    expect(countryCode("London, UK")).toBe("GB");
    expect(countryCode("Seoul, South Korea")).toBe("KR");
    expect(countryFlag("Lisbon, Portugal")).toBe("🇵🇹");
    expect(countryFlag("Rome")).toBeNull();
  });
});

describe("answers from the earlier quiz", () => {
  it("are still recognized but never offered", () => {
    expect(offered(INTERESTS)).not.toContain("Museums & art");
    expect(INTERESTS.some((o) => o.label === "Museums & art" && o.legacy)).toBe(true);
    // Cards name a place with the earlier, more specific words first.
    expect(describePlace(CUISINES, "a family trattoria")).toBe("Italian");
    expect(describePlace(STAY_TYPES, "A grand luxury resort")).toBe("Luxury resort");
    expect(describePlace(STAY_TYPES, "Inn at the lake")).toBe("Inn");
    // "Inn" is a word of its own, not part of "dinner".
    expect(describePlace(STAY_TYPES, "rooftop dinner and drinks")).toBeUndefined();
  });
});
