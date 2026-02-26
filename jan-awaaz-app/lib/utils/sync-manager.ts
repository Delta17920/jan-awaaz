// Sync manager for offline operations
import { offlineStorage, QueuedOperation } from './offline-storage';

export class SyncManager {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Listen for service worker messages
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_QUEUE') {
            this.syncQueue();
          }
        });
      }
    }
  }

  private handleOnline() {
    this.isOnline = true;
    console.log('Connection restored - syncing queued operations');
    this.syncQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('Connection lost - operations will be queued');
  }

  async queueOperation(type: 'voice' | 'document' | 'referral', payload: any): Promise<void> {
    const operation: QueuedOperation = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
    };

    await offlineStorage.queueOperation(operation);
    console.log('Operation queued:', operation.id);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncQueue();
    }
  }

  async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const operations = await offlineStorage.getQueuedOperations();
      console.log(`Syncing ${operations.length} queued operations`);

      for (const operation of operations) {
        try {
          await this.processOperation(operation);
          await offlineStorage.removeQueuedOperation(operation.id);
          console.log('Operation synced:', operation.id);
        } catch (error) {
          console.error('Failed to sync operation:', operation.id, error);
          // Keep in queue for retry
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processOperation(operation: QueuedOperation): Promise<void> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL + '/api/orchestrate';
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(operation.payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

export const syncManager = new SyncManager();
