import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let PermissionsAndroid = null;
try {
  PermissionsAndroid = require('react-native').PermissionsAndroid;
} catch (error) {
  // PermissionsAndroid not available
}

const SMS_PERMISSION_KEY = 'sms_permission_granted';

const isExpoGo = () => {
  return (
    Platform.OS === 'android' &&
    (PermissionsAndroid === null ||
     PermissionsAndroid === undefined ||
     typeof PermissionsAndroid.check !== 'function')
  );
};

export const checkSMSPermission = async () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (isExpoGo()) {
    try {
      const permission = await AsyncStorage.getItem(SMS_PERMISSION_KEY);
      const hasPermission = permission === 'expo_go' || permission === 'true';
      return hasPermission;
    } catch (error) {
      return false;
    }
  }

  try {
    if (!PermissionsAndroid || !PermissionsAndroid.check) {
      return false;
    }

    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
    
    if (granted) {
      await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'true');
    }
    
    return granted;
  } catch (error) {
    return false;
  }
};

export const requestSMSPermission = async () => {
  const isExpoGo = Platform.OS === 'android' && 
    (typeof PermissionsAndroid === 'undefined' || PermissionsAndroid.check === undefined);

  if (Platform.OS !== 'android') {
    Alert.alert(
      'Not Available',
      'SMS reading is only available on Android devices.',
      [{ text: 'OK' }]
    );
    return false;
  }

  if (isExpoGo) {
    await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'expo_go');
    return true;
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
    if (isExpoGo) {
      await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'expo_go');
      return true;
    }
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
  const inExpoGo = isExpoGo();

  const message = inExpoGo
    ? 'Test Mode\n\nSMS reading uses mock data for testing in Expo Go.\n\nTap "Enable" to start!'
    : 'Allow PocketExpense+ to read SMS messages to automatically track expenses from bank transaction alerts.\n\nYour privacy is protected - SMS data stays on your device.';

  return new Promise((resolve) => {
    Alert.alert(
      'Enable Auto-Expense Detection',
      message,
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => {
            resolve(false);
          },
        },
        {
          text: 'Enable',
          onPress: async () => {
            try {
              const granted = await requestSMSPermission();
              resolve(granted);
            } catch (error) {
              resolve(false);
            }
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
    // Silent error handling
  }
};
