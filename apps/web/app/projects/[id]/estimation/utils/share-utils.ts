import { toast } from 'sonner';
import { Filter } from '@/components/ui/filters';
import type { ProjectBoqDomainLinesType } from '../types';

export interface ShareableState {
  filters: Filter[];
  query: string;
  segmentId?: string | null;
  type: ProjectBoqDomainLinesType;
}

/**
 * Extracts current state for sharing
 */
export function getShareableState(
  filters: Filter[],
  query: string,
  segmentId?: string | null,
  type?: ProjectBoqDomainLinesType
): ShareableState {
  return {
    filters,
    query,
    segmentId: segmentId || null,
    type: type ?? 'estimation',
  };
}

/**
 * Generates a shareable URL with current state
 */
export function generateShareableUrl(
  projectId: string,
  state: ShareableState
): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const url = new URL(`/projects/${projectId}`, baseUrl);

  url.searchParams.set('tab', state.type);

  // Add filters if any
  if (state.filters.length > 0) {
    url.searchParams.set('filters', JSON.stringify(state.filters));
  }

  // Add segment if selected
  if (state.segmentId) {
    url.searchParams.set('segment', state.segmentId);
  }

  // Add query if any
  if (state.query.trim()) {
    url.searchParams.set('query', state.query.trim());
  }

  return url.toString();
}

/**
 * Copies text to clipboard and shows toast feedback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (success) {
        toast.success('Shareable link copied to clipboard');
        return true;
      } else {
        toast.error('Failed to copy to clipboard');
        return false;
      }
    }

    await navigator.clipboard.writeText(text);
    toast.success('Shareable link copied to clipboard');
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
    return false;
  }
}
