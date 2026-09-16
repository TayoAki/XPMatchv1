// @vitest-environment node
import { describe, expect, it } from "vitest";
import { constraintActions, searchAgainMessage } from "@/lib/constraints-store";
import { COMPARE_LIMIT, compareActions, compareMessage } from "@/lib/compare-store";

describe("constraints store", () => {
  it("deduplicates labels, removes and toggles must-have", () => {
    constraintActions.set("t1", {
      kind: "hotels",
      toolCallId: "c1",
      constraints: [
        { label: "Quiet", type: "vibe", hard: false },
        { label: "quiet ", type: "vibe", hard: true },
        { label: "Pool", type: "amenity", hard: false },
      ],
      notUnderstood: ["good vibes", ""],
    });
    expect(constraintActions.get("t1")?.constraints.map((c) => c.label)).toEqual(["Quiet", "Pool"]);
    expect(constraintActions.get("t1")?.notUnderstood).toEqual(["good vibes"]);
    constraintActions.toggleHard("t1", "pool");
    expect(constraintActions.get("t1")?.constraints[1].hard).toBe(true);
    constraintActions.remove("t1", "Quiet");
    expect(constraintActions.get("t1")?.constraints.map((c) => c.label)).toEqual(["Pool"]);
    constraintActions.add("t1", { label: "Rooftop bar", type: "amenity", hard: false });
    constraintActions.add("t1", { label: "rooftop bar", type: "amenity", hard: false });
    expect(constraintActions.get("t1")?.constraints).toHaveLength(2);
    constraintActions.clear("t1");
    expect(constraintActions.get("t1")).toBeNull();
  });

  it("phrases the re-search message from hard and soft chips", () => {
    const msg = searchAgainMessage(
      "hotels",
      [
        { label: "Under $250/night", type: "budget", hard: true },
        { label: "Pool", type: "amenity", hard: false },
      ],
      "Rome",
    );
    expect(msg).toBe("Search places to stay in Rome again with these filters: must have Under $250/night and ideally Pool.");
    expect(searchAgainMessage("restaurants", [])).toBe("Search restaurants again without any of the previous filters.");
  });
});

describe("compare store", () => {
  const option = (key: string) => ({ key, name: key, kind: "hotel" as const, facts: "" });

  it("toggles up to the limit and clears", () => {
    expect(compareActions.toggle("c", option("a"))).toBe(true);
    expect(compareActions.toggle("c", option("b"))).toBe(true);
    expect(compareActions.toggle("c", option("c"))).toBe(true);
    expect(compareActions.list("c")).toHaveLength(COMPARE_LIMIT);
    expect(compareActions.toggle("c", option("d"))).toBe(false);
    expect(compareActions.toggle("c", option("a"))).toBe(true);
    expect(compareActions.isSelected("c", "a")).toBe(false);
    compareActions.clear("c");
    expect(compareActions.list("c")).toEqual([]);
  });

  it("builds the comparison request with card facts", () => {
    expect(compareMessage([{ ...option("Hotel A"), facts: "$200/night" }, option("Hotel B")])).toBe(
      "Compare these options side by side for me, on what matters most to me: Hotel A ($200/night); Hotel B.",
    );
  });
});
