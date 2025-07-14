import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineAction {
  id: string;
  type: 'CREATE_ORDER' | 'UPDATE_PROFILE' | 'SUBMIT_PAYMENT';
  data: any;
  timestamp: number;
}

export class OfflineService {
  private static OFFLINE_ACTIONS_KEY = 'offline_actions';
  private static isOnline = true;

  static async initialize() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        this.syncOfflineActions();
      }
    });
  }

  static async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
    const offlineAction: OfflineAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    const existingActions = await this.getOfflineActions();
    const updatedActions = [...existingActions, offlineAction];
    
    await AsyncStorage.setItem(
      this.OFFLINE_ACTIONS_KEY,
      JSON.stringify(updatedActions)
    );
  }

  static async getOfflineActions(): Promise<OfflineAction[]> {
    try {
      const actions = await AsyncStorage.getItem(this.OFFLINE_ACTIONS_KEY);
      return actions ? JSON.parse(actions) : [];
    } catch (error) {
      console.error('Error getting offline actions:', error);
      return [];
    }
  }

  static async clearOfflineActions() {
    await AsyncStorage.removeItem(this.OFFLINE_ACTIONS_KEY);
  }

  static async syncOfflineActions() {
    if (!this.isOnline) return;

    const actions = await this.getOfflineActions();
    if (actions.length === 0) return;

    console.log(`Syncing ${actions.length} offline actions...`);

    for (const action of actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Keep failed actions for retry
        continue;
      }
    }

    await this.clearOfflineActions();
  }

  private static async executeAction(action: OfflineAction) {
    // Import API service dynamically to avoid circular dependencies
    const { apiService } = await import('./api');

    switch (action.type) {
      case 'CREATE_ORDER':
        await apiService.createOrder(action.data);
        break;
      case 'UPDATE_PROFILE':
        await apiService.updateProfile(action.data);
        break;
      case 'SUBMIT_PAYMENT':
        await apiService.submitPayment(action.data.orderId, action.data.paymentData);
        break;
      default:
        console.warn('Unknown offline action type:', action.type);
    }
  }

  static getConnectionStatus() {
    return this.isOnline;
  }
}