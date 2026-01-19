import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getPendingSMSExpenses,
  updateSMSExpenseStatus,
  processSMSForExpenses,
} from '../services/smsReader';
import { addExpense } from '../services/api';
import { ensureSMSPermission } from '../services/smsPermissions';

export default function SMSExpensesScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    loadExpenses();
    checkAndRequestPermission();

    const smsEventListener = DeviceEventEmitter.addListener(
      'newSMSExpenseDetected',
      () => {
        loadExpenses();
      }
    );

    return () => {
      smsEventListener.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadExpenses();
    });
    return unsubscribe;
  }, [navigation]);

  const checkAndRequestPermission = async () => {
    if (!permissionChecked) {
      const hasPermission = await ensureSMSPermission(false);
      if (hasPermission) {
        await processSMSForExpenses(30);
        loadExpenses();
      }
      setPermissionChecked(true);
    }
  };

  const loadExpenses = async () => {
    try {
      const data = await getPendingSMSExpenses();
      setExpenses(data);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      const hasPermission = await ensureSMSPermission(true);
      
      if (hasPermission) {
        const detected = await processSMSForExpenses(30);
        await loadExpenses();
        
        if (detected && detected.length > 0) {
          Alert.alert(
            'Success',
            `Detected ${detected.length} expense${detected.length > 1 ? 's' : ''} from SMS!`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'No Expenses Found',
            'No expense transactions found in SMS.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Permission Required',
          'SMS permission is needed to detect expenses.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process SMS.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirm = async (expense) => {
    setProcessingId(expense.id);
    
    try {
      const expenseData = {
        amount: expense.amount,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        date: new Date(expense.date),
        description: expense.description || `${expense.merchant}`,
      };
      
      await addExpense(expenseData);
      await updateSMSExpenseStatus(expense.id, 'confirmed');
      
      Alert.alert('Success', 'Expense confirmed and added!');
      loadExpenses();
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm expense');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (expense) => {
    Alert.alert(
      'Reject Expense',
      'Are you sure this is not an expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(expense.id);
            await updateSMSExpenseStatus(expense.id, 'rejected');
            loadExpenses();
            setProcessingId(null);
          },
        },
      ]
    );
  };

  const handleEdit = (expense) => {
    navigation.navigate('AddExpense', {
      smsExpense: expense,
      onSave: async () => {
        await updateSMSExpenseStatus(expense.id, 'confirmed');
        loadExpenses();
      },
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      Food: ['#FF6B9D', '#C44569'],
      Transport: ['#4FACFE', '#00F2FE'],
      Shopping: ['#FA709A', '#FEE140'],
      Bills: ['#A8E6CF', '#3DDC84'],
      Entertainment: ['#FFA07A', '#FF6347'],
      Health: ['#89F7FE', '#66A6FF'],
      Other: ['#B39DDB', '#7E57C2'],
    };
    return colors[category] || ['#667EEA', '#764BA2'];
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Food: '🍽️',
      Transport: '🚗',
      Shopping: '🛍️',
      Bills: '📄',
      Entertainment: '🎬',
      Health: '⚕️',
      Other: '📌',
    };
    return icons[category] || '📌';
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const renderExpense = ({ item }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <LinearGradient
          colors={getCategoryColor(item.category)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryIcon}
        >
          <Text style={styles.categoryEmoji}>{getCategoryIcon(item.category)}</Text>
        </LinearGradient>
        
        <View style={styles.expenseInfo}>
          <Text style={styles.merchantName}>{item.merchant}</Text>
          <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
          <Text style={styles.smsSource}>From: {item.smsSender}</Text>
        </View>
        
        <View style={styles.amountContainer}>
          <Text style={styles.expenseAmount}>₹{item.amount}</Text>
          {item.needsReview && (
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewText}>Review</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.expenseDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{item.category}</Text>
          <Text style={styles.confidenceText}>
            {Math.round(item.confidence * 100)}% confident
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment:</Text>
          <Text style={styles.detailValue}>{item.paymentMethod}</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
          disabled={processingId === item.id}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item)}
          disabled={processingId === item.id}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton]}
          onPress={() => handleConfirm(item)}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#667EEA" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Auto-Detected Expenses</Text>
        <Text style={styles.headerSubtitle}>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} detected from SMS
        </Text>
      </LinearGradient>

      {expenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📱</Text>
          <Text style={styles.emptyTitle}>No Detected Expenses</Text>
          <Text style={styles.emptyText}>
            Expenses are automatically detected from your bank SMS messages.
            {'\n\n'}
            Pull down to refresh and check for new messages.
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpense}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
  },
  header: {
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
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    padding: 16,
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  expenseInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  smsSource: {
    fontSize: 12,
    color: '#667EEA',
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#667EEA',
    marginBottom: 4,
  },
  reviewBadge: {
    backgroundColor: '#FFA07A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  expenseDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
    paddingTop: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
  },
  confidenceText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#F8F9FD',
    borderWidth: 1,
    borderColor: '#667EEA',
  },
  editButtonText: {
    color: '#667EEA',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  rejectButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
