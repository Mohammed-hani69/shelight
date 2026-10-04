import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * دمج أسماء الفئات مع tailwind-merge لتفادي التعارضات.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
