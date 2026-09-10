import { describe, expect, it } from "vitest";
import { computeOrderStatus, isValidTransition } from "./order-status";
import type { ProductStatus } from "@/types";

describe("computeOrderStatus", () => {
  it("returns completed for an empty item list", () => {
    expect(computeOrderStatus([])).toBe("completed");
  });

  it("returns completed when every item is kept or return_shipped", () => {
    expect(computeOrderStatus(["kept", "return_shipped", "kept"])).toBe("completed");
  });

  it("returns ready_for_return when any item is to_be_returned", () => {
    expect(computeOrderStatus(["kept", "to_be_returned", "return_shipped"])).toBe("ready_for_return");
  });

  it("returns awaiting_decision when any item is awaiting_decision, even alongside to_be_returned", () => {
    expect(computeOrderStatus(["to_be_returned", "awaiting_decision"])).toBe("awaiting_decision");
  });

  it("returns awaiting_delivery when any item is in_transit, overriding every other status", () => {
    const items: ProductStatus[] = ["in_transit", "awaiting_decision", "to_be_returned", "kept"];
    expect(computeOrderStatus(items)).toBe("awaiting_delivery");
  });
});

describe("isValidTransition", () => {
  it.each([
    ["awaiting_decision", "kept"],
    ["awaiting_decision", "to_be_returned"],
    ["kept", "to_be_returned"],
    ["to_be_returned", "return_shipped"],
    ["return_shipped", "to_be_returned"],
  ] satisfies [ProductStatus, ProductStatus][])("allows %s -> %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  it("rejects skipping a step (kept -> return_shipped)", () => {
    expect(isValidTransition("kept", "return_shipped")).toBe(false);
  });

  it("rejects moving out of a terminal-ish state (return_received -> kept)", () => {
    expect(isValidTransition("return_received", "kept")).toBe(false);
  });

  it("rejects any transition out of in_transit (no FR reaches it in this slice)", () => {
    expect(isValidTransition("in_transit", "awaiting_decision")).toBe(false);
  });
});
