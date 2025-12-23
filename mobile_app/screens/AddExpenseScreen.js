import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { addExpense } from '../services/api';
import { saveOfflineExpense } from '../services/offlineSync';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Net Banking'];

export default function AddExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter valid amount');
      return;
    }

    setLoading(true);
    const expense = {
      amount: parseFloat(amount),
      category,
      paymentMethod,
      date: new Date(date),
      description,
    };

    try {
      await addExpense(expense);
      Alert.alert('Success', 'Expense added successfully');
      navigation.goBack();
    } catch (error) {
      console.log('Error adding expense:', error);
      
      if (error.message === 'Network Error' || !error.response) {
        await saveOfflineExpense(expense);
        Alert.alert(
          'Saved Offline',
          'Expense saved locally. Will sync when online.'
        );
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to add expense');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>Add New Expense</Text>
        <Text style={styles.headerSubtitle}>Track your spending</Text>
      </LinearGradient>
      
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor="#C7C7CC"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(value) => setCategory(value)}
              style={styles.picker}
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value)}
              style={styles.picker}
            >
              {PAYMENT_METHODS.map((method) => (
                <Picker.Item key={method} label={method} value={method} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#C7C7CC"
            value={date}
            onChangeText={setDate}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add notes..."
            placeholderTextColor="#C7C7CC"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#667EEA', '#764BA2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Expense</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    marginBottom: 8,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});


