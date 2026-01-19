// SMS Reader Service - Reads and processes SMS messages
import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSMSToExpense, parseSMSBatch } from './smsParser';
import { checkSMSPermission } from './smsPermissions';

// Import SMS libraries only if available (will be undefined in Expo Go)
let SmsAndroid = null;
let SmsListener = null;

try {
  SmsAndroid = require('react-native-get-sms-android').default || require('react-native-get-sms-android');
  SmsListener = require('react-native-android-sms-listener').default || require('react-native-android-sms-listener');
} catch (error) {
  // SMS native modules not available
}

const SMS_EXPENSES_KEY = 'sms_detected_expenses';
const LAST_SMS_READ_TIME_KEY = 'last_sms_read_time';

export const getAllSMS = async (sinceTimestamp = null, maxCount = 500) => {
  // Check if running in Expo Go (no native modules available)
  const isExpoGo = typeof SmsAndroid === 'undefined' || SmsAndroid === null;
  
  if (isExpoGo || Platform.OS !== 'android') {
    return getMockSMS(sinceTimestamp, maxCount);
  }

  const hasPermission = await checkSMSPermission();
  if (!hasPermission) {
    return [];
  }

  try {
    const filter = {
      box: 'inbox',
      indexFrom: 0,
      maxCount: maxCount,
    };

    if (sinceTimestamp) {
      filter.minDate = sinceTimestamp;
    }

    return new Promise((resolve, reject) => {
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail) => {
          resolve(getMockSMS(sinceTimestamp, maxCount));
        },
        (count, smsList) => {
          try {
            const messages = JSON.parse(smsList);
            const formattedMessages = messages.map(sms => ({
              message: sms.body || '',
              sender: sms.address || '',
              timestamp: sms.date || Date.now(),
            }));
            resolve(formattedMessages);
          } catch (error) {
            resolve(getMockSMS(sinceTimestamp, maxCount));
          }
        }
      );
    });
  } catch (error) {
    return getMockSMS(sinceTimestamp, maxCount);
  }
};

/**
 * Get mock SMS messages for testing in Expo Go
 */
const getMockSMS = (sinceTimestamp = null, maxCount = 500) => {
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const startTime = sinceTimestamp || thirtyDaysAgo;
  
  // Generate realistic mock SMS messages
  const mockMessages = [
    {
      message: 'Rs.450 debited from A/c XX1234 on ' + new Date(now - 86400000).toLocaleDateString('en-IN') + ' to Zomato via UPI Ref:XXXXXX',
      sender: 'SBIINB',
      timestamp: now - 86400000, // Yesterday
    },
    {
      message: 'INR 120.00 debited from Card XX5678 at Metro Card Recharge on ' + new Date(now - 172800000).toLocaleDateString('en-IN'),
      sender: 'HDFCBK',
      timestamp: now - 172800000, // 2 days ago
    },
    {
      message: 'Rs 2499.00 spent on Amazon India using Card XX9012. Available bal: Rs XXXXX',
      sender: 'ICICIB',
      timestamp: now - 259200000, // 3 days ago
    },
    {
      message: 'You have paid Rs.299 to Netflix India via UPI on ' + new Date(now - 345600000).toLocaleDateString('en-IN'),
      sender: 'PAYTM',
      timestamp: now - 345600000, // 4 days ago
    },
    {
      message: 'Rs 50.00 sent to Uber India via UPI Txn ID: XXXXXX',
      sender: 'PHONEPE',
      timestamp: now - 432000000, // 5 days ago
    },
    {
      message: 'Rs.850 debited from A/c XX1234 on ' + new Date(now - 518400000).toLocaleDateString('en-IN') + ' to Swiggy via UPI',
      sender: 'SBIINB',
      timestamp: now - 518400000, // 6 days ago
    },
    {
      message: 'INR 150.00 debited for mobile recharge Airtel Prepaid on ' + new Date(now - 604800000).toLocaleDateString('en-IN'),
      sender: 'HDFCBK',
      timestamp: now - 604800000, // 7 days ago
    },
    {
      message: 'Rs 1200 spent at Reliance Fresh using Card XX5678',
      sender: 'AXIS',
      timestamp: now - 691200000, // 8 days ago
    },
  ];

  const filtered = mockMessages.filter(msg => msg.timestamp >= startTime);
  const limited = filtered.slice(0, maxCount);
  return limited;
};

export const getRecentSMS = async (days = 30) => {
  const sinceTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
  return await getAllSMS(sinceTimestamp);
};

export const processSMSForExpenses = async (days = 30) => {
  try {
    const hasPermission = await checkSMSPermission();
    if (!hasPermission) {
      return [];
    }

    const smsMessages = await getRecentSMS(days);
    
    if (smsMessages.length === 0) {
      return [];
    }

    const detectedExpenses = parseSMSBatch(smsMessages);
    await saveSMSExpenses(detectedExpenses);
    await AsyncStorage.setItem(LAST_SMS_READ_TIME_KEY, Date.now().toString());
    
    return detectedExpenses;
  } catch (error) {
    return [];
  }
};

export const saveSMSExpenses = async (expenses) => {
  try {
    const existing = await getSMSExpenses();
    
    const merged = [...existing];
    
    for (const expense of expenses) {
      const isDuplicate = existing.some(e => 
        e.amount === expense.amount &&
        e.merchant === expense.merchant &&
        new Date(e.date).toDateString() === new Date(expense.date).toDateString()
      );
      
      if (!isDuplicate) {
        merged.push({
          ...expense,
          id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    await AsyncStorage.setItem(SMS_EXPENSES_KEY, JSON.stringify(merged));
    return merged;
  } catch (error) {
    return [];
  }
};

export const getSMSExpenses = async () => {
  try {
    const data = await AsyncStorage.getItem(SMS_EXPENSES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const getPendingSMSExpenses = async () => {
  try {
    const expenses = await getSMSExpenses();
    return expenses.filter(e => e.status === 'pending');
  } catch (error) {
    return [];
  }
};

export const updateSMSExpenseStatus = async (expenseId, status) => {
  try {
    const expenses = await getSMSExpenses();
    const updated = expenses.map(e => 
      e.id === expenseId ? { ...e, status } : e
    );
    await AsyncStorage.setItem(SMS_EXPENSES_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    return false;
  }
};

export const deleteSMSExpense = async (expenseId) => {
  try {
    const expenses = await getSMSExpenses();
    const filtered = expenses.filter(e => e.id !== expenseId);
    await AsyncStorage.setItem(SMS_EXPENSES_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    return false;
  }
};

export const clearSMSExpenses = async () => {
  try {
    await AsyncStorage.removeItem(SMS_EXPENSES_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

export const getLastSMSReadTime = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SMS_READ_TIME_KEY);
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    return null;
  }
};

let smsSubscription = null;

export const startSMSListener = async () => {
  if (Platform.OS !== 'android') {
    return null;
  }

  const hasPermission = await checkSMSPermission();
  if (!hasPermission) {
    return null;
  }

  try {
    const isExpoGo = typeof SmsListener === 'undefined' || SmsListener === null;
    
    if (isExpoGo || Platform.OS !== 'android') {
      return null;
    }

    stopSMSListener();

    smsSubscription = SmsListener.addListener(async (message) => {
      try {
        const expense = parseSMSToExpense({
          message: message.body,
          sender: message.originatingAddress,
          timestamp: message.timestamp || Date.now(),
        });

        if (expense) {
          await saveSMSExpenses([expense]);
          DeviceEventEmitter.emit('newSMSExpenseDetected', expense);
        }
      } catch (error) {
        // Silent error handling
      }
    });

    return smsSubscription;
  } catch (error) {
    return null;
  }
};

export const stopSMSListener = () => {
  if (smsSubscription) {
    smsSubscription.remove();
    smsSubscription = null;
  }
};

export const isSMSListenerActive = () => {
  return smsSubscription !== null;
};

