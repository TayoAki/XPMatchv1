import { describe, expect, it } from "vitest";
import { diceSimilarity, nameTokens, normalizeName, pickCatalogMatch, primaryName } from "@/lib/places/names";

const c = (id: string, name: string, userRatingCount = 0) => ({ id, nameNorm: normalizeName(name), userRatingCount });

const ROME = [
  c("russie", "Hotel de Russie", 2140),
  c("roma", "Hotel de Roma", 900),
  c("artemide", "Hotel Artemide", 5320),
  c("roscioli", "Roscioli Salumeria con Cucina", 6100),
  c("forno", "Antico Forno Roscioli", 3000),
  c("enzo", "Trattoria Da Enzo al 29", 4400),
  c("colosseum", "Colosseum", 402000),
  c("pantheon", "Pantheon", 250000),
  c("borghese", "Villa Borghese", 98000),
  c("cafe", "Café Sant'Eustachio", 12000),
];

describe("normalizeName", () => {
  it("drops accents, punctuation and a leading article", () => {
    expect(normalizeName("Café Sant'Eustachio")).toBe("cafe sant eustachio");
    expect(normalizeName("The Pantheon")).toBe("pantheon");
    expect(normalizeName("  Il  Colosseo ")).toBe("colosseo");
    expect(normalizeName("Ben & Jerry's")).toBe("ben and jerry s");
  });
});

describe("primaryName", () => {
  it("keeps the part before the first comma", () => {
    expect(primaryName("Roscioli, Centro Storico, Rome, Italy")).toBe("Roscioli");
    expect(primaryName("Colosseum")).toBe("Colosseum");
  });
});

describe("diceSimilarity", () => {
  it("is 1 for identical sets and 0 for disjoint ones", () => {
    expect(diceSimilarity(nameTokens("a b c"), nameTokens("c b a"))).toBe(1);
    expect(diceSimilarity(nameTokens("a b"), nameTokens("c d"))).toBe(0);
  });
});

describe("pickCatalogMatch", () => {
  it("finds exact names whatever the hint and city suffix", () => {
    expect(pickCatalogMatch("Colosseum, Monti, Rome, Italy", ROME)?.id).toBe("colosseum");
    expect(pickCatalogMatch("The Pantheon", ROME)?.id).toBe("pantheon");
    expect(pickCatalogMatch("Cafe Sant Eustachio", ROME)?.id).toBe("cafe");
  });

  it("takes a longer stored name the query is a prefix of, not one that merely contains it", () => {
    expect(pickCatalogMatch("Roscioli, Rome", ROME)?.id).toBe("roscioli");
  });

  it("matches a multi-word query inside a longer name", () => {
    expect(pickCatalogMatch("Trattoria Da Enzo, Trastevere, Rome, Italy", ROME)?.id).toBe("enzo");
  });

  it("does not confuse hotels that share generic words", () => {
    expect(pickCatalogMatch("Hotel de Russie, Rome", ROME)?.id).toBe("russie");
    expect(pickCatalogMatch("Hotel de Venezia, Rome", ROME)).toBeNull();
  });

  it("returns null for short or unknown queries", () => {
    expect(pickCatalogMatch("Ro", ROME)).toBeNull();
    expect(pickCatalogMatch("Osteria Fernanda, Rome", ROME)).toBeNull();
  });

  it("prefers the place more people rated when two names tie", () => {
    const twins = [c("a", "Osteria Nuova", 10), c("b", "Osteria Nuova", 500)];
    expect(pickCatalogMatch("Osteria Nuova", twins)?.id).toBe("b");
  });
});
