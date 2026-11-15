// Source removal: every contact who signed up from one source (SparkLoop's, by default) goes dormant some days after
// signing up, whatever they did. Three checks, on day 8, 10 and 13 by default, so nobody slips through: one a check
// missed, or who came back in between, goes at the next. Run by the hourly cron; dormant, never deleted.
import { connectDb } from "./db.js";
import { moveContacts } from "./status-changes.js";
import Contact from "../models/Contact.js";
import Newsletter from "../models/Newsletter.js";

import { DAY_MS, getSourceRemovalSettings, sourceMatcher } from "./source-removal-rules.js";

export { getSourceRemovalProblem, getSourceRemovalSettings, sourceMatcher } from "./source-removal-rules.js";

// The contacts one check moves: from the source, still getting emails, signed up at least day days ago.
export function sourceRemovalFilter({ accountId, newsletterId, source, day, now = Date.now() }) {
	return { accountId, newsletterId, source: sourceMatcher(source), subscribedAt: { $lte: new Date(now - day * DAY_MS) } };
}

export async function runSourceRemovals(now = Date.now()) {
	await connectDb();
	const newsletters = await Newsletter.find({ "sourceRemoval.enabled": true }, { accountId: 1, sourceRemoval: 1 }, { crossAccount: true }).lean();
	const results = [];
	for (const newsletter of newsletters) {
		const { source, days } = getSourceRemovalSettings(newsletter);
		for (const day of days) {
			const moved = await moveContacts(sourceRemovalFilter({ accountId: newsletter.accountId, newsletterId: newsletter._id, source, day, now }), {
				from: ["active", "pending"],
				to: "dormant",
				via: "source-removal",
				reason: `day ${day}`,
				at: new Date(now),
			});
			if (moved) results.push({ newsletterId: String(newsletter._id), day, moved });
		}
	}
	return { newsletters: newsletters.length, removed: results };
}

// How many contacts the source has, and how many of them it already made dormant.
export async function countSourceRemoval({ accountId, newsletterId, source }) {
	const [fromSource, removed] = await Promise.all([
		Contact.countDocuments({ accountId, newsletterId, source: sourceMatcher(source) }),
		Contact.countDocuments({ accountId, newsletterId, source: sourceMatcher(source), status: "dormant", "statusChanges.via": "source-removal" }),
	]);
	return { fromSource, removed };
}
