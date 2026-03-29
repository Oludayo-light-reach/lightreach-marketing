/** Platforms aligned with `User` / `Content` schema enums */
export const PLATFORMS = [
  "X",
  "LinkedIn",
  "Threads",
  "TikTok",
  "Instagram",
  "Facebook",
  "YouTube",
  "Twitch",
  "Discord",
  "Reddit",
  "Telegram",
  "WhatsApp",
  "Signal",
  "Email",
  "SMS",
  "Phone",
  "Other",
] as const;

export type PlatformKey = (typeof PLATFORMS)[number];

/** Platforms allowed on `User.followers` (matches User schema enum; safe for client bundles) */
export const USER_FOLLOWER_PLATFORMS = [
  "X",
  "LinkedIn",
  "Threads",
  "TikTok",
  "Instagram",
] as const satisfies readonly PlatformKey[];

export type UserFollowerPlatform = (typeof USER_FOLLOWER_PLATFORMS)[number];

/** Tailwind chip classes for calendar / badges (dark UI) */
export const PLATFORM_CHIP_CLASS: Record<string, string> = {
  X: "bg-sky-500/25 text-sky-300 border-sky-500/40",
  LinkedIn: "bg-blue-600/25 text-blue-300 border-blue-500/40",
  Threads: "bg-zinc-500/25 text-zinc-200 border-zinc-500/40",
  TikTok: "bg-fuchsia-600/25 text-fuchsia-300 border-fuchsia-500/40",
  Instagram: "bg-pink-600/25 text-pink-300 border-pink-500/40",
  Facebook: "bg-indigo-600/25 text-indigo-300 border-indigo-500/40",
  YouTube: "bg-red-600/25 text-red-300 border-red-500/40",
  Twitch: "bg-violet-600/25 text-violet-300 border-violet-500/40",
  Discord: "bg-indigo-500/25 text-indigo-200 border-indigo-400/40",
  Reddit: "bg-orange-600/25 text-orange-300 border-orange-500/40",
  Telegram: "bg-sky-600/25 text-sky-200 border-sky-500/40",
  WhatsApp: "bg-emerald-600/25 text-emerald-300 border-emerald-500/40",
  Signal: "bg-blue-500/25 text-blue-200 border-blue-400/40",
  Email: "bg-amber-600/25 text-amber-300 border-amber-500/40",
  SMS: "bg-teal-600/25 text-teal-300 border-teal-500/40",
  Phone: "bg-slate-600/25 text-slate-300 border-slate-500/40",
  Other: "bg-zinc-600/25 text-zinc-300 border-zinc-500/40",
};

export function chipClassForPlatform(platform?: string | null): string {
  if (!platform) return PLATFORM_CHIP_CLASS.Other;
  return PLATFORM_CHIP_CLASS[platform] ?? PLATFORM_CHIP_CLASS.Other;
}
