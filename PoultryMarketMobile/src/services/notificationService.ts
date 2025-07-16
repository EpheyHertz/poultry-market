import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  static async registerForPushNotifications() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      alert('Must use physical device for Push Notifications');
    }

    return token;
  }

  static async scheduleLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: { seconds: 1 },
    });
  }

  static async scheduleOrderNotification(orderStatus: string, orderNumber: string) {
    const notifications = {
      CONFIRMED: {
        title: 'Order Confirmed',
        body: `Your order #${orderNumber} has been confirmed!`,
      },
      PACKED: {
        title: 'Order Packed',
        body: `Your order #${orderNumber} is packed and ready for delivery.`,
      },
      OUT_FOR_DELIVERY: {
        title: 'Out for Delivery',
        
        body: `Your order #${orderNumber} is on its way!`,
      },
      DELIVERED: {
        title: 'Order Delivered',
        body: `Your order #${orderNumber} has been delivered successfully.`,
      },
    };

    const notification = notifications[orderStatus as keyof typeof notifications];
    if (notification) {
      await this.scheduleLocalNotification(notification.title, notification.body, {
        orderNumber,
        orderStatus,
      });
    }
  }
}