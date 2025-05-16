/**
 * Helper functions for admin-specific operations
 */

/**
 * Opens a media item in a new window with admin permissions
 * This ensures admins can view content that's pending review
 * 
 * @param contentId The ID of the content to view
 */
export function viewPendingContent(contentId: number): void {
  window.open(`/media/${contentId}?admin=true`, '_blank');
}