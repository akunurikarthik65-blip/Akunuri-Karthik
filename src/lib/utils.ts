import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSentiment(score: number) {
  if (score > 0.3) return "Positive";
  if (score < -0.3) return "Negative";
  return "Neutral";
}

export function getSentimentColor(score: number) {
  if (score > 0.3) return "text-green-600 bg-green-50 border-green-200";
  if (score < -0.3) return "text-red-600 bg-red-50 border-red-200";
  return "text-yellow-600 bg-yellow-50 border-yellow-200";
}
