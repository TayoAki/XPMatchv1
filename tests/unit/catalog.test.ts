import { describe, expect, it } from "vitest";
import { diceSimilarity, nameTokens, normalizeName, pickCatalogMatch, primaryName, shortPlaceName, shortTitle } from "@/lib/places/names";

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

describe("shortPlaceName", () => {
  it("drops the chain and area parts after the name", () => {
    expect(shortPlaceName("Josun Palace, a Luxury Collection Hotel, Seoul Gangnam")).toBe("Josun Palace");
    expect(shortPlaceName("Hotel de Russie, a Rocco Forte Hotel")).toBe("Hotel de Russie");
    expect(shortPlaceName("Andaz Seoul Gangnam, by Hyatt")).toBe("Andaz Seoul Gangnam");
    expect(shortPlaceName("Grand Hotel Palace - an IHG Hotel")).toBe("Grand Hotel Palace");
    expect(shortPlaceName("Hotel Nine Tree by Hilton")).toBe("Hotel Nine Tree");
  });

  it("title-cases a name written in capitals and drops a name in brackets", () => {
    expect(shortPlaceName("HOTEL THE MITSUI KYOTO, a Luxury Collection Hotel & Spa")).toBe("Hotel The Mitsui Kyoto");
    expect(shortPlaceName("N SEOUL TOWER")).toBe("N Seoul Tower");
    expect(shortPlaceName("Myeongdong Kyoja (명동교자)")).toBe("Myeongdong Kyoja");
    expect(shortPlaceName("Halal Korean Restaurant (Home Cooked Meal Gim Soensaeng")).toBe("Halal Korean Restaurant");
  });

  it("leaves ordinary names alone", () => {
    for (const name of ["Four Seasons Hotel Seoul", "Roscioli Salumeria con Cucina", "Ritz-Carlton Kyoto", "Four Points by Sheraton Josun", "Lotte World Tower & Mall", "W"]) {
      expect(shortPlaceName(name)).toBe(name);
    }
  });
});

describe("shortTitle", () => {
  it("shortens a trip title only when it is the place's listing name", () => {
    const place = { name: "Josun Palace, a Luxury Collection Hotel, Seoul Gangnam" };
    expect(shortTitle(place.name, place)).toBe("Josun Palace");
    expect(shortTitle("Check in - Josun Palace", place)).toBe("Check in - Josun Palace");
    expect(shortTitle("Dinner - Roscioli, Rome", null)).toBe("Dinner - Roscioli, Rome");
  });
});
