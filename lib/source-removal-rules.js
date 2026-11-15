// Source removal's settings, for the browser too: no database here (lib/source-removal.js runs it).
export const DAY_MS = 24 * 60 * 60 * 1000;
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

