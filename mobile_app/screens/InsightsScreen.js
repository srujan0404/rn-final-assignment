import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getInsights, getCategoryBreakdown } from '../services/api';

export default function InsightsScreen() {
  const [insights, setInsights] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [insightsData, breakdownData] = await Promise.all([
        getInsights(),
        getCategoryBreakdown(startDate.toISOString(), endDate.toISOString()),
      ]);

      setInsights(insightsData);
      setBreakdown(breakdownData);
    } catch (error) {
      console.log('Error loading insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#667EEA" />
      </View>
    );
  }

  const totalSpent = breakdown.reduce((sum, item) => sum + item.total, 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#34C759', '#30D158']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Insights</Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending Insights</Text>
        {insights.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              Not enough data yet. Add more expenses to see insights!
            </Text>
          </View>
        ) : (
          insights.map((insight, index) => (
            <LinearGradient
              key={index}
              colors={['#667EEA', '#764BA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.insightCard}
            >
              <Text style={styles.insightText}>{insight.message}</Text>
              <View style={styles.insightDetails}>
                <View style={styles.insightDetailBox}>
                  <Text style={styles.insightDetailLabel}>Last month</Text>
                  <Text style={styles.insightDetailValue}>₹{insight.lastAmount}</Text>
                </View>
                <View style={styles.insightDetailBox}>
                  <Text style={styles.insightDetailLabel}>This month</Text>
                  <Text style={styles.insightDetailValue}>₹{insight.currentAmount}</Text>
                </View>
              </View>
            </LinearGradient>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Month's Breakdown</Text>
        {breakdown.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              No expenses this month
            </Text>
          </View>
        ) : (
          <>
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.totalCard}
            >
              <Text style={styles.totalLabel}>Total Spent This Month</Text>
              <Text style={styles.totalAmount}>₹{totalSpent.toFixed(2)}</Text>
            </LinearGradient>

            {breakdown.map((item, index) => {
              const percentage = ((item.total / totalSpent) * 100).toFixed(1);
              return (
                <View key={index} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{item._id}</Text>
                    <Text style={styles.categoryAmount}>₹{item.total}</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <LinearGradient
                      colors={getCategoryColor(item._id)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.progressBar,
                        { width: `${percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryPercentage}>
                    {percentage}% of total • {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </View>

    </ScrollView>
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
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  insightCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  insightText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  insightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightDetailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 10,
    flex: 0.48,
  },
  insightDetailLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  insightDetailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  totalCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  categoryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667EEA',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#F0F0F5',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  categoryPercentage: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 22,
    flex: 1,
    fontWeight: '500',
  },
});


