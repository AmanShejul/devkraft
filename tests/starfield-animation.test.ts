import { describe, expect, it } from "vitest";
import { getCursorPosition, getStarCursorOffset, getStarTwinkle } from "@/components/landing/starfield-animation";

describe("starfield twinkle", () => {
  it("has visible brightness variation over time and stays within a safe range", () => {
    const brightness = [0, 1000, 2000, 3000, 4000, 5000].map((time) =>
      getStarTwinkle(time, 2, 0));

    expect(Math.max(...brightness) - Math.min(...brightness)).toBeGreaterThan(0.5);
    expect(brightness.every((value) => value >= 0.38 && value <= 1)).toBe(true);
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
