// The four fires and the streak thresholds that light them.

export const STATE_NAMES = ["ASHEN", "KINDLED", "BLAZING", "ETERNAL"];

/** Where KINDLED, BLAZING and ETERNAL start. */
export const DEFAULT_THRESHOLDS = [1, 4, 15];

/**
 * Parse the `thresholds` input, e.g. "1,4,15".
 * @param {string|number[]|undefined} value
 * @returns {number[]}
 */
export function parseThresholds(value) {
  if (value === undefined || value === null || value === "") return [...DEFAULT_THRESHOLDS];
  const parts = Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim());
  const nums = parts.map(Number);
  const ok =
    nums.length === 3 &&
    nums.every((n) => Number.isInteger(n) && n >= 1) &&
    nums[0] < nums[1] &&
    nums[1] < nums[2];
  if (!ok) {
    throw new Error(
      `Invalid thresholds "${value}": expected three increasing whole numbers of days, like "1,4,15".`,
    );
  }
  return nums;
}

/**
 * The fire level for a streak: 0 ASHEN, 1 KINDLED, 2 BLAZING, 3 ETERNAL.
 * @param {number} streak
 * @param {number[]} [thresholds]
 */
export function stateOf(streak, thresholds = DEFAULT_THRESHOLDS) {
  let level = 0;
  for (const t of thresholds) if (streak >= t) level++;
  return level;
}
