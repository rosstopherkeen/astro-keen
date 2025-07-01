import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function readingTime(html: string) {
  const textOnly = html.replace(/<[^>]+>/g, '')
  const wordCount = textOnly.split(/\s+/).length
  const readingTimeMinutes = (wordCount / 200 + 1).toFixed()
  return `${readingTimeMinutes} min read`
}

export function getHeadingMargin(depth: number): string {
  switch (depth) {
    case 2:
      return 'ml-0'
    case 3:
      return 'ml-4'
    case 4:
      return 'ml-8'
    case 5:
      return 'ml-12'
    case 6:
      return 'ml-16'
    default:
      return 'ml-0'
  }
}
