// SMS Reader Service - Reads and processes SMS messages
import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmsAndroid from 'react-native-get-sms-android';
import SmsListener from 'react-native-android-sms-listener';
import { parseSMSToExpense, parseSMSBatch } from './smsParser';
import { checkSMSPermission } from './smsPermissions';

const SMS_EXPENSES_KEY = 'sms_detected_expenses';
const LAST_SMS_READ_TIME_KEY = 'last_sms_read_time';

export const getAllSMS = async (sinceTimestamp = null, maxCount = 500) => {
  if (Platform.OS !== 'android') {
    console.log('SMS reading is only available on Android');
    return [];
  }

  const hasPermission = await checkSMSPermission();
  if (!hasPermission) {
    console.log('SMS permission not granted');
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
          console.error('Failed to read SMS:', fail);
          reject(new Error(fail));
        },
        (count, smsList) => {
          try {
            const messages = JSON.parse(smsList);
            console.log(`Successfully read ${count} SMS messages`);
            
            const formattedMessages = messages.map(sms => ({
              message: sms.body || '',
              sender: sms.address || '',
              timestamp: sms.date || Date.now(),
            }));
            
            resolve(formattedMessages);
          } catch (error) {
            console.error('Error parsing SMS list:', error);
            resolve([]);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in getAllSMS:', error);
    return [];
  }
};

export const getRecentSMS = async (days = 30) => {
  const sinceTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
  return await getAllSMS(sinceTimestamp);
};

export const processSMSForExpenses = async (days = 30) => {
  try {
    const hasPermission = await checkSMSPermission();
    if (!hasPermission) {
      console.log('SMS permission not granted');
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
    console.error('Error processing SMS for expenses:', error);
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
    console.error('Error saving SMS expenses:', error);
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
    console.error('Error getting SMS expenses:', error);
    return [];
  }
};

export const getPendingSMSExpenses = async () => {
  try {
    const expenses = await getSMSExpenses();
    return expenses.filter(e => e.status === 'pending');
  } catch (error) {
    console.error('Error getting pending SMS expenses:', error);
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
    console.error('Error updating SMS expense status:', error);
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
    console.error('Error deleting SMS expense:', error);
    return false;
  }
};

export const clearSMSExpenses = async () => {
  try {
    await AsyncStorage.removeItem(SMS_EXPENSES_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing SMS expenses:', error);
    return false;
  }
};

export const getLastSMSReadTime = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SMS_READ_TIME_KEY);
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    console.error('Error getting last SMS read time:', error);
    return null;
  }
};

let smsSubscription = null;

export const startSMSListener = async () => {
  if (Platform.OS !== 'android') {
    console.log('SMS listener is only available on Android');
    return null;
  }

  const hasPermission = await checkSMSPermission();
  if (!hasPermission) {
    console.log('SMS permission required for listener');
    return null;
  }

  try {
    stopSMSListener();

    smsSubscription = SmsListener.addListener(async (message) => {
      console.log('New SMS received:', message.originatingAddress);
      
      try {
        const expense = parseSMSToExpense({
          message: message.body,
          sender: message.originatingAddress,
          timestamp: message.timestamp || Date.now(),
        });

        if (expense) {
          console.log('Expense detected from SMS:', expense.merchant, expense.amount);
          await saveSMSExpenses([expense]);
          
          DeviceEventEmitter.emit('newSMSExpenseDetected', expense);
        }
      } catch (error) {
        console.error('Error processing incoming SMS:', error);
      }
    });

    console.log('SMS listener started successfully');
    return smsSubscription;
  } catch (error) {
    console.error('Error starting SMS listener:', error);
    return null;
  }
};

export const stopSMSListener = () => {
  if (smsSubscription) {
    smsSubscription.remove();
    smsSubscription = null;
    console.log('SMS listener stopped');
  }
};

export const isSMSListenerActive = () => {
  return smsSubscription !== null;
};

export const addSampleSMSExpenses = async () => {
  const samples = [
    {
      id: `sms_${Date.now()}_1`,
      amount: 450,
      merchant: 'Zomato',
      category: 'Food',
      paymentMethod: 'UPI',
      date: new Date(),
      description: 'Auto-detected from SMS: Zomato',
      confidence: 0.95,
      needsReview: false,
      status: 'pending',
      originalSMS: 'Rs.450 debited from A/c XX1234 on 26-12-24 to Zomato via UPI',
      smsSender: 'SBIINB',
      createdAt: new Date().toISOString(),
    },
    {
      id: `sms_${Date.now()}_2`,
      amount: 120,
      merchant: 'Metro Card Recharge',
      category: 'Transport',
      paymentMethod: 'Card',
      date: new Date(Date.now() - 86400000),
      description: 'Auto-detected from SMS: Metro Card Recharge',
      confidence: 0.85,
      needsReview: false,
      status: 'pending',
      originalSMS: 'INR 120.00 debited from Card XX5678 at Metro Card Recharge on 25-12-24',
      smsSender: 'HDFCBK',
      createdAt: new Date().toISOString(),
    },
    {
      id: `sms_${Date.now()}_3`,
      amount: 2499,
      merchant: 'Amazon India',
      category: 'Shopping',
      paymentMethod: 'Card',
      date: new Date(Date.now() - 172800000),
      description: 'Auto-detected from SMS: Amazon India',
      confidence: 0.9,
      needsReview: false,
      status: 'pending',
      originalSMS: 'Rs 2499.00 spent on Amazon India using Card XX9012. Available bal: Rs XXXXX',
      smsSender: 'ICICIB',
      createdAt: new Date().toISOString(),
    },
  ];
  
  await saveSMSExpenses(samples);
  return samples;
};

