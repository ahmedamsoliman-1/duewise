import test from "node:test";
import assert from "node:assert/strict";
import { advanceDate, nextOccurrenceDate, shouldCreateNextOccurrence } from "./recurring";

test("advances monthly dates to the next matching interval", () => {
  assert.equal(nextOccurrenceDate("2025-01-15", "monthly"), "2025-02-15");
  assert.equal(nextOccurrenceDate("2025-01-31", "monthly"), "2025-02-28");
});

test("advances dates to the next future occurrence when the current date is in the past", () => {
  assert.equal(advanceDate("2024-01-15", "monthly", "2024-02-15"), "2024-02-15");
  assert.equal(advanceDate("2024-01-15", "monthly", "2024-03-01"), "2024-02-15");
});

test("stops recurring items when the end date has already passed", () => {
  assert.equal(shouldCreateNextOccurrence("2025-01-15", "monthly", "2025-01-10"), false);
  assert.equal(shouldCreateNextOccurrence("2025-01-15", "monthly", "2025-02-20"), true);
});
