import assert from "node:assert/strict";
import { test } from "node:test";
import { getSourceRemovalProblem, getSourceRemovalSettings, sourceMatcher, sourceRemovalFilter } from "../lib/source-removal.js";
import "../lib/source-removal-rules.js";

const DAY_MS = 24 * 60 * 60 * 1000;

test("defaults to SparkLoop on day 8, 10 and 13, off", () => {
	assert.deepEqual(getSourceRemovalSettings({}), { enabled: false, source: "sparkloop", days: [8, 10, 13] });
	assert.deepEqual(getSourceRemovalSettings({ sourceRemoval: { enabled: true, source: "podcast", days: [5, 2] } }), {
		enabled: true,
		source: "podcast",
		days: [2, 5],
	});
});

test("the source matches what starts with it, any case", () => {
	const matcher = sourceMatcher("sparkloop");
	assert.ok(matcher.test("sparkloop-upscribe"));
	assert.ok(matcher.test("SparkLoop"));
	assert.ok(!matcher.test("google_signup"));
	assert.ok(!matcher.test("not-sparkloop"));
	assert.ok(sourceMatcher("a.b").test("a.b") && !sourceMatcher("a.b").test("axb"));
});

test("a check picks contacts signed up at least its days ago", () => {
	const now = Date.parse("2027-01-20T00:00:00Z");
	const filter = sourceRemovalFilter({ accountId: "a", newsletterId: "n", source: "sparkloop", day: 8, now });
	assert.equal(filter.subscribedAt.$lte.getTime(), now - 8 * DAY_MS);
	assert.equal(filter.accountId, "a");
});

test("days and source are checked", () => {
	assert.equal(getSourceRemovalProblem({ days: [8, 10, 13] }), null);
	assert.ok(getSourceRemovalProblem({ days: [0] }));
	assert.ok(getSourceRemovalProblem({ days: [1, 2, 3, 4, 5, 6] }));
	assert.ok(getSourceRemovalProblem({ days: [2.5] }));
	assert.ok(getSourceRemovalProblem({ source: " " }));
});
