// Type definitions for JoogadTools common.js utilities

/**
 * Global JoogadTools utility object
 */
declare namespace JoogadTools {
  /**
   * Renders the site header into the DOM.
   * @param currentPath - The relative path used to construct links (e.g., '../../' or '')
   */
  function renderHeader(currentPath?: string): void;

  /**
   * Renders the site footer into the DOM.
   * @param currentPath - The relative path used to construct links
   */
  function renderFooter(currentPath?: string): void;

  /**
   * DOM element holding the toast notifications
   */
  let toastContainer: HTMLElement | null;

  /**
   * Displays a temporary toast notification on the screen.
   * @param message - The text to display
   * @param type - Determines the icon and styling
   * @param duration - Time in milliseconds before the toast disappears
   */
  function showToast(
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    duration?: number
  ): void;

  /**
   * Copies text to the user's clipboard and shows a success/error toast.
   * @param text - The text to copy
   * @returns Promise resolving to true if copied successfully, false otherwise
   */
  function copyToClipboard(text: string): Promise<boolean>;

  /**
   * Triggers a browser download for the provided content.
   * @param content - The data to download
   * @param filename - Name of the file
   * @param mimeType - Used internally to create the Blob
   */
  function downloadFile(content: string | Blob, filename: string, mimeType?: string): void;

  /**
   * Converts a canvas element to a PNG data URL and triggers a download.
   * @param canvas - The target canvas element
   * @param filename - Name of the downloaded image
   */
  function downloadCanvas(canvas: HTMLCanvasElement, filename?: string): void;

  /**
   * Initializes tab switching behavior.
   * @param containerSelector - CSS selector for the tab container
   */
  function initTabs(containerSelector?: string): void;

  /**
   * Calculates the relative base path traversal string.
   * @param currentPath - The current subdirectory path
   * @returns String with '../' appended for nested depths
   */
  function getBasePath(currentPath?: string): string;

  /**
   * Injects advertisement HTML code into a designated container.
   * @param containerId - ID of the container element
   * @param adCode - HTML/JS string provided by the ad network
   */
  function injectAd(containerId: string, adCode: string): void;

  /**
   * Limits the rate at which a function can fire.
   * @param fn - The execution function
   * @param delay - Wait delay in milliseconds
   * @returns A wrapper function
   */
  function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay?: number
  ): (...args: Parameters<T>) => void;

  /**
   * Automatically initializes Google Analytics if the Measurement ID is setup.
   */
  function initTracking(): void;
}
