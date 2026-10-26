/** One performance of the Live engine. `dur` is in seconds. */
export interface GeekyAction {
  id: string;
  label: string;
  group: string;
  loop?: boolean;
  dur: number;
  desc?: string;
  [key: string]: unknown;
}
/** Public catalogue entry: ids are a semver contract (removing or renaming one is a major release). */
export interface GeekyActionEntry {
  id: string;
  label: string;
  group: string;
  loop?: boolean;
  duration: number;
  description?: string;
}
export const ACTIONS: Record<string, GeekyAction>;
export const GROUPS: Record<string, string>;
export const ALIASES: Readonly<Record<string, string>>;
/** Resolves an id or alias; throws RangeError for an unknown id. */
export function resolveAction(id: string): GeekyAction;
export const ACTION_LIST: GeekyActionEntry[];
