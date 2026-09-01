import { describe, expect, it } from "vitest";
import { compressRecipePhoto } from "./recipe-photo";

describe("recipe photo preparation", () => {
  it("rejects a non-image before attempting browser decoding", async () => {
    const file = new File(["not an image"], "recipe.txt", {
      type: "text/plain",
    });

    await expect(compressRecipePhoto(file)).rejects.toThrow(
      "Choose a JPG, PNG, or WebP image.",
    );
  });

  it("rejects an image source larger than the 10 MB input limit", async () => {
    const file = new File([new Uint8Array(10_000_001)], "recipe.png", {
      type: "image/png",
    });

    await expect(compressRecipePhoto(file)).rejects.toThrow(
      "Choose an image smaller than 10 MB.",
    );
  });
});
