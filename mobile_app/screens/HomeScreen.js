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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getExpenses, deleteExpense } from '../services/api';
import { syncOfflineExpenses } from '../services/offlineSync';
import { useAuth } from '../context/AuthContext';
import { getPendingSMSExpenses } from '../services/smsReader';

export default function HomeScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [pendingSMSCount, setPendingSMSCount] = useState(0);
  const { user, logout } = useAuth();
  const userName = user?.name || 'User';

  useEffect(() => {
    loadExpenses();
    syncOfflineData();
    loadPendingSMSCount();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadExpenses();
      loadPendingSMSCount();
    });
    return unsubscribe;
  }, [navigation]);

  const syncOfflineData = async () => {
    try {
      await syncOfflineExpenses();
    } catch (error) {
      // Silent error handling
    }
  };

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPendingSMSCount = async () => {
    try {
      const pendingExpenses = await getPendingSMSExpenses();
      setPendingSMSCount(pendingExpenses.length);
    } catch (error) {
      // Silent error handling
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(id);
              loadExpenses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const getFilteredExpenses = () => {
    if (filter === 'all') return expenses;

    const now = new Date();
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      if (filter === 'daily') {
        return (
          expDate.getDate() === now.getDate() &&
          expDate.getMonth() === now.getMonth() &&
          expDate.getFullYear() === now.getFullYear()
        );
      } else if (filter === 'monthly') {
        return (
          expDate.getMonth() === now.getMonth() &&
          expDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  };

  const getTotalAmount = () => {
    return getFilteredExpenses().reduce((sum, exp) => sum + exp.amount, 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
      Food: '🍔',
      Transport: '🚗',
      Shopping: '🛍️',
      Bills: '📄',
      Entertainment: '🎬',
      Health: '🏥',
      Other: '📌',
    };
    return icons[category] || '💰';
  };

  const renderExpense = ({ item }) => (
    <TouchableOpacity
      style={styles.expenseCard}
      onPress={() => navigation.navigate('EditExpense', { expense: item })}
    >
      <LinearGradient
        colors={getCategoryColor(item.category)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.categoryIcon}
      >
        <Text style={styles.categoryEmoji}>{getCategoryIcon(item.category)}</Text>
      </LinearGradient>
      <View style={styles.expenseLeft}>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
        <Text style={styles.expensePayment}>{item.paymentMethod}</Text>
      </View>
      <View style={styles.expenseRight}>
        <Text style={styles.expenseAmount}>₹{item.amount}</Text>
        <TouchableOpacity
          onPress={() => handleDelete(item._id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}</Text>
            <Text style={styles.totalLabel}>Total Spent</Text>
            <Text style={styles.totalAmount}>₹{getTotalAmount()}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'daily' && styles.filterActive]}
          onPress={() => setFilter('daily')}
        >
          <Text style={[styles.filterText, filter === 'daily' && styles.filterTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'monthly' && styles.filterActive]}
          onPress={() => setFilter('monthly')}
        >
          <Text style={[styles.filterText, filter === 'monthly' && styles.filterTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.insightsButton}
          onPress={() => navigation.navigate('Insights')}
        >
          <Text style={styles.insightsButtonText}>Insights</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.smsButton}
          onPress={() => navigation.navigate('SMSExpenses')}
        >
          <View style={styles.smsButtonContent}>
            <Text style={styles.smsButtonIcon}>📱</Text>
            <View style={styles.smsButtonTextContainer}>
              <Text style={styles.smsButtonTitle}>SMS Expenses</Text>
              <Text style={styles.smsButtonSubtitle}>Auto-detected from messages</Text>
            </View>
            {pendingSMSCount > 0 && (
              <View style={styles.smsBadge}>
                <Text style={styles.smsBadgeText}>{pendingSMSCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getFilteredExpenses()}
        renderItem={renderExpense}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadExpenses} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first expense</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddExpense')}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterActive: {
    backgroundColor: '#667EEA',
    shadowColor: '#667EEA',
    shadowOpacity: 0.3,
  },
  filterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  insightsButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: '#34C759',
    marginLeft: 'auto',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  insightsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  expenseLeft: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 3,
  },
  expensePayment: {
    fontSize: 12,
    color: '#667EEA',
    fontWeight: '500',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 20,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#C7C7CC',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667EEA',
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '300',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  smsButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  smsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smsButtonIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  smsButtonTextContainer: {
    flex: 1,
  },
  smsButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  smsButtonSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  smsBadge: {
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});


