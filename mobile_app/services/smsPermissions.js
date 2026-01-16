import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SMS_PERMISSION_KEY = 'sms_permission_granted';

export const checkSMSPermission = async () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
    
    if (granted) {
      await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'true');
    }
    
    return granted;
  } catch (error) {
    console.error('Error checking SMS permission:', error);
    return false;
  }
};

export const requestSMSPermission = async () => {
  if (Platform.OS !== 'android') {
    Alert.alert(
      'Not Available',
      'SMS reading is only available on Android devices.',
      [{ text: 'OK' }]
    );
    return false;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission Required',
        message: 'PocketExpense+ needs access to read SMS messages to automatically detect and track your expenses from bank transaction alerts.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      }
    );

    const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
    
    if (isGranted) {
      await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'true');
    } else {
      await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'false');
    }
    
    return isGranted;
  } catch (error) {
    console.error('Error requesting SMS permission:', error);
    return false;
  }
};

export const hasUserDeniedPermission = async () => {
  try {
    const value = await AsyncStorage.getItem(SMS_PERMISSION_KEY);
    return value === 'false';
  } catch (error) {
    return false;
  }
};

export const showPermissionRationale = async () => {
  return new Promise((resolve) => {
    Alert.alert(
      'Enable Auto-Expense Detection',
      'Allow PocketExpense+ to read SMS messages to automatically track expenses from bank transaction alerts.\n\n✓ Saves time\n✓ Accurate tracking\n✓ Never miss an expense\n\nYour privacy is protected - SMS data stays on your device.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Enable',
          onPress: async () => {
            const granted = await requestSMSPermission();
            resolve(granted);
          },
        },
      ]
    );
  });
};

export const ensureSMSPermission = async (showRationale = true) => {
  const hasPermission = await checkSMSPermission();
  if (hasPermission) {
    return true;
  }

  const denied = await hasUserDeniedPermission();
  
  if (denied && !showRationale) {
    return false;
  }

  if (showRationale) {
    return await showPermissionRationale();
  } else {
    return await requestSMSPermission();
  }
};

export const resetPermissionStatus = async () => {
  try {
    await AsyncStorage.removeItem(SMS_PERMISSION_KEY);
  } catch (error) {
    console.error('Error resetting permission status:', error);
  }
};

