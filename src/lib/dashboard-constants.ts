import { getHalfHourTimeOptions } from "@/lib/format-ui";

export const START_TIME_OPTIONS = getHalfHourTimeOptions(false); // 00:00 .. 23:30
export const END_TIME_OPTIONS = getHalfHourTimeOptions(true).slice(1); // 00:30 .. 24:00
export const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 240] as const;
export const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 7] as const;

