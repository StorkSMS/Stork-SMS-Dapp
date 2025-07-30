/**
 * Priority loading queue for link previews
 * Prioritizes newest messages and visible previews
 */

interface LoadingTask {
  url: string;
  priority: number; // Higher number = higher priority
  timestamp: number;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

class LinkLoadingQueue {
  private queue: LoadingTask[] = [];
  private processing = false;
  private maxConcurrent = 2; // Maximum concurrent requests
  private activeRequests = 0;

  /**
   * Add a URL to the loading queue
   * @param url - URL to load
   * @param priority - Priority level (higher = more important)
   * @returns Promise that resolves with the preview data
   */
  async addToQueue(url: string, priority: number = 0): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: LoadingTask = {
        url,
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      // Insert task in priority order (highest priority first)
      const insertIndex = this.queue.findIndex(t => t.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(task);
      } else {
        this.queue.splice(insertIndex, 0, task);
      }

      this.processQueue();
    });
  }

  /**
   * Update priority of a URL in the queue
   * @param url - URL to update
   * @param newPriority - New priority level
   */
  updatePriority(url: string, newPriority: number) {
    const taskIndex = this.queue.findIndex(t => t.url === url);
    if (taskIndex !== -1) {
      const task = this.queue[taskIndex];
      this.queue.splice(taskIndex, 1);
      
      task.priority = newPriority;
      
      // Re-insert in correct position
      const insertIndex = this.queue.findIndex(t => t.priority < newPriority);
      if (insertIndex === -1) {
        this.queue.push(task);
      } else {
        this.queue.splice(insertIndex, 0, task);
      }
    }
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const task = this.queue.shift()!;
      this.activeRequests++;

      // Process task without blocking the queue
      this.processTask(task).finally(() => {
        this.activeRequests--;
        this.processQueue(); // Continue processing
      });
    }

    this.processing = false;
  }

  /**
   * Process a single task
   */
  private async processTask(task: LoadingTask) {
    try {
      // Dynamic import to avoid circular dependency
      const { getLinkPreviewData } = await import('./url-utils');
      const data = await getLinkPreviewData(task.url);
      task.resolve(data);
    } catch (error) {
      task.reject(error);
    }
  }

  /**
   * Get queue status for debugging
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      processing: this.processing
    };
  }
}

// Global instance
export const linkLoadingQueue = new LinkLoadingQueue();

/**
 * Priority levels for different scenarios
 */
export const PRIORITY_LEVELS = {
  VISIBLE_NEWEST: 100,    // Visible and newest message
  NEWEST: 50,             // Newest messages (last 5)
  VISIBLE: 25,            // Currently visible in viewport
  NORMAL: 10,             // Regular loading
  BACKGROUND: 1           // Background/prefetch loading
} as const;