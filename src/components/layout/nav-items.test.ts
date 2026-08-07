import { describe, expect, it } from "vitest";
import { buildNavItems } from "./nav-items";

const hrefs = (perms: Parameters<typeof buildNavItems>[0]) => buildNavItems(perms).map((item) => item.href);

describe("buildNavItems", () => {
  it("omits the Live item entirely when live meter is disabled", () => {
    expect(hrefs({ isLiveMeterEnabled: false })).not.toContain("/live");
    // No disabled placeholder, teaser, or badge either -- it's simply absent.
    expect(buildNavItems({ isLiveMeterEnabled: false }).some((i) => i.href === "/live")).toBe(false);
  });

  it("shows the Live item, right after Dashboard, when enabled", () => {
    const items = hrefs({ isLiveMeterEnabled: true });
    expect(items).toContain("/live");
    expect(items.indexOf("/live")).toBe(items.indexOf("/") + 1);
  });

  it("orders the full nav as Dashboard, Live, Data, Activities, Settings", () => {
    expect(hrefs({ isLiveMeterEnabled: true, isActivitiesEnabled: true })).toEqual([
      "/",
      "/live",
      "/data",
      "/activities",
      "/settings"
    ]);
  });

  it("keeps Live and Activities independent, and appends Admin last", () => {
    expect(hrefs({ isLiveMeterEnabled: true, isActivitiesEnabled: false })).toEqual([
      "/",
      "/live",
      "/data",
      "/settings"
    ]);
    expect(hrefs({ isAdmin: true, isLiveMeterEnabled: true })).toEqual(["/", "/live", "/data", "/settings", "/admin"]);
  });
});
