import AsyncStorage from '@react-native-async-storage/async-storage';
import { bulkAddExpenses } from './api';

const OFFLINE_EXPENSES_KEY = 'offline_expenses';

export const saveOfflineExpense = async (expense) => {
  try {
    const existingExpenses = await getOfflineExpenses();
    existingExpenses.push(expense);
    await AsyncStorage.setItem(OFFLINE_EXPENSES_KEY, JSON.stringify(existingExpenses));
  } catch (error) {
    // Silent error handling
  }
};

export const getOfflineExpenses = async () => {
  try {
    const expenses = await AsyncStorage.getItem(OFFLINE_EXPENSES_KEY);
    return expenses ? JSON.parse(expenses) : [];
  } catch (error) {
    return [];
  }
};

export const syncOfflineExpenses = async () => {
  try {
    const offlineExpenses = await getOfflineExpenses();
    
    if (offlineExpenses.length === 0) {
      return;
    }

    await bulkAddExpenses(offlineExpenses);
    await AsyncStorage.removeItem(OFFLINE_EXPENSES_KEY);
  } catch (error) {
    // Silent error handling
  }
};


