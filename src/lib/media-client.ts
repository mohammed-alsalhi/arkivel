export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (response.status === 204) return undefined as T
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data as T
}

export type { LibraryHealth } from '@/media/types'
