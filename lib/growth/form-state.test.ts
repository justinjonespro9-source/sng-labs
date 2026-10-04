import { describe, expect, it } from "vitest";
import { safeReturnTo, submittedList, submittedText, submittedValues } from "./form-state";

function withReturnTo(value: string) {
  const data = new FormData();
  data.set("returnTo", value);
  return data;
}

describe("safeReturnTo", () => {
  it("keeps Command Center paths including the selected filter", () => {
    expect(safeReturnTo(withReturnTo("/command-center/scorecards?brand=abc"), "/x")).toBe("/command-center/scorecards?brand=abc");
    expect(safeReturnTo(withReturnTo("/command-center"), "/x")).toBe("/command-center");
  });

  it("falls back for anything outside the Command Center", () => {
    for (const value of ["", "https://evil.example/command-center", "//evil.example", "/command-centerx", "/command-center//evil", "/command-center\\evil", "/sign-in"]) {
      expect(safeReturnTo(withReturnTo(value), "/command-center/scorecards")).toBe("/command-center/scorecards");
    }
  });
});

describe("submittedValues", () => {
  it("keeps text fields, groups repeated checkbox names and drops React action fields", () => {
    const data = new FormData();
    data.append("name", "Fall push");
    data.append("brandIds", "a");
    data.append("brandIds", "b");
    data.append("$ACTION_ID_abc", "");
    data.append("asset", new Blob(["x"]), "x.txt");
    const values = submittedValues(data);
    expect(values).toEqual({ name: "Fall push", brandIds: ["a", "b"] });
    expect(submittedText(values, "name")).toBe("Fall push");
    expect(submittedList(values, "brandIds")).toEqual(["a", "b"]);
  });

  it("treats an absent checkbox group as an explicit empty selection only after a submission", () => {
    expect(submittedList(null, "brandIds")).toBeUndefined();
    expect(submittedList({ name: "x" }, "brandIds")).toEqual([]);
    expect(submittedText(null, "name")).toBeUndefined();
    expect(submittedText({ name: "" }, "name")).toBe("");
  });
});
