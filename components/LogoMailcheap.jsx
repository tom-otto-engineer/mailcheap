import { cn } from "@/lib/utils";

// A paper plane in two facets. The share images draw the same shapes, so they import these.
export const LOGO_VIEWBOX = "11 9 45 45";
export const LOGO_FACETS = { upper: "M13 31 52 14 31 37Z", lower: "M31 37 52 14 41.5 50Z" };
export const LOGO_SHADE = 0.35;

// Ombak's mark: two waves on a dark tile.
export default function LogoMailcheap({ className }) {
	return (
		<svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-6 shrink-0", className)}>
			<rect width="32" height="32" rx="7" fill="#1b100e" />
			<path d="M4 13c3.2-4.6 6.4-4.6 9.6 0s6.4 4.6 9.6 0" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".55" />
			<path d="M4 19c3.2-4.6 6.4-4.6 9.6 0s6.4 4.6 9.6 0c1.6-2.3 3.2-3 4.8-2.2" stroke="#f2622e" strokeWidth="2.6" fill="none" strokeLinecap="round" />
		</svg>
	);
}
