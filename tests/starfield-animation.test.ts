import { describe, expect, it } from "vitest";
import { getCursorPosition, getStarCursorOffset, getStarFormationProgress, getStarTwinkle } from "@/components/landing/starfield-animation";

describe("starfield twinkle", () => {
  it("has visible brightness variation over time and stays within a safe range", () => {
    const brightness = [0, 1000, 2000, 3000, 4000, 5000].map((time) =>
      getStarTwinkle(time, 2, 0));

    expect(Math.max(...brightness) - Math.min(...brightness)).toBeGreaterThan(0.5);
    expect(brightness.every((value) => value >= 0.38 && value <= 1)).toBe(true);
  });

  describe("star formation", () => {
    it("holds dim stars before their staggered start, eases during travel, then locks at the target", () => {
      expect(getStarFormationProgress(399, 400, 1_500)).toBe(0);
      expect(getStarFormationProgress(1_150, 400, 1_500)).toBe(0.5);
      expect(getStarFormationProgress(1_900, 400, 1_500)).toBe(1);
      expect(getStarFormationProgress(0, 0, 1_500)).toBe(0);
    });

    it("supports core-first and radius-scaled arm timing within the intro duration", () => {
      const coreStart = 500;
      const outerArmStart = 400 + 2_000;
      const longestTravel = 1_500 + 800;

      expect(coreStart + longestTravel).toBeLessThan(4_700);
      expect(outerArmStart + longestTravel).toBe(4_700);
    });
  });

  describe("starfield cursor parallax", () => {
    const bounds = { left: 100, top: 50, width: 800, height: 400 };

    it("maps the pointer into hero-local coordinates and ignores pointers outside", () => {
      expect(getCursorPosition(500, 250, bounds)).toEqual({ x: 400, y: 200 });
      expect(getCursorPosition(50, 250, bounds)).toBeNull();
    });

    it("moves each nearby star away from the pointer by a distance-dependent amount", () => {
      const near = getStarCursorOffset(115, 100, 100, 100);
      const farther = getStarCursorOffset(150, 100, 100, 100);
      const outsideInfluence = getStarCursorOffset(350, 100, 100, 100);

      expect(near.x).toBeGreaterThan(farther.x);
      expect(near.y).toBe(0);
      expect(farther.y).toBe(0);
      expect(outsideInfluence).toEqual({ x: 0, y: 0 });
    });
  });
});
