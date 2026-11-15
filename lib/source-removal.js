// Source removal: every contact who signed up from one source (SparkLoop's, by default) goes dormant some days after
// signing up, whatever they did. Three checks, on day 8, 10 and 13 by default, so nobody slips through: one a check
// missed, or who came back in between, goes at the next. Run by the hourly cron; dormant, never deleted.
import { connectDb } from "./db.js";
import { moveContacts } from "./status-changes.js";
import Contact from "../models/Contact.js";
import Newsletter from "../models/Newsletter.js";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SOURCE_REMOVAL_DEFAULTS = { source: "sparkloop", days: [8, 10, 13] };
export const SOURCE_REMOVAL_LIMITS = { maxChecks: 5, minDay: 1, maxDay: 365 };

export function getSourceRemovalSettings(newsletter) {
	const { enabled, source, days } = newsletter?.sourceRemoval ?? {};
	return {
		enabled: enabled === true,
		source: source || SOURCE_REMOVAL_DEFAULTS.source,
		days: Array.isArray(days) && days.length ? [...days].sort((a, b) => a - b) : SOURCE_REMOVAL_DEFAULTS.days,
	};
}

export function getSourceRemovalProblem(settings) {
	const { source, days } = settings ?? {};
	if (source !== undefined && (typeof source !== "string" || !source.trim() || source.length > 100)) {
		return "Source removal needs a source, 100 characters at most";
	}
	if (days === undefined || days === null) return null;
	const { maxChecks, minDay, maxDay } = SOURCE_REMOVAL_LIMITS;
	if (!Array.isArray(days) || days.length > maxChecks || days.some((day) => !Number.isInteger(day) || day < minDay || day > maxDay)) {
		return `Source removal days should be up to ${maxChecks} whole numbers from ${minDay} to ${maxDay}`;
	}
	return null;
}

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The source and anything after it: "sparkloop" matches sparkloop-upscribe too. Case doesn't matter.
export function sourceMatcher(source) {
	return new RegExp(`^${escapeRegExp(source.trim())}`, "i");
}

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
