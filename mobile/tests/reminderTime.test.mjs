import test from "node:test";
import assert from "node:assert/strict";
import { formatReminderTime, parseReminderTime } from "../src/utils/reminderTime.js";

test("parseReminderTime validates correct range", () => {
  assert.deepEqual(parseReminderTime("21", "30"), { isValid: true, hour: 21, minute: 30 });
  assert.equal(parseReminderTime("24", "00").isValid, false);
  assert.equal(parseReminderTime("-1", "00").isValid, false);
  assert.equal(parseReminderTime("10", "60").isValid, false);
});

test("formatReminderTime returns HH:MM", () => {
  assert.equal(formatReminderTime(9, 5), "09:05");
  assert.equal(formatReminderTime(21, 30), "21:30");
});
