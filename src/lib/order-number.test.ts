import assert from "node:assert/strict";
import test from "node:test";
import { generateOrderNumber } from "./order-number";

const ORDER_NUMBER_PATTERN = /^FS-\d{8}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

test("generateOrderNumber uses a six-character high-entropy suffix", () => {
  assert.match(generateOrderNumber(), ORDER_NUMBER_PATTERN);
});

test("generateOrderNumber avoids ambiguous characters across repeated samples", () => {
  for (let index = 0; index < 200; index += 1) {
    assert.match(generateOrderNumber(), ORDER_NUMBER_PATTERN);
  }
});
