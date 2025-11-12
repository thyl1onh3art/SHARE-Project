import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

type FinancialRecord = {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  description: string;
  date: string;
};

type SharedAccount = {
  _id: string;
  name: string;
  members: string[];
  financeRecords: any[];
};

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();

  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError('');

      try {
        const [financeResponse, accountsResponse] = await Promise.all([
          client.get<FinancialRecord[]>('/finance'),
          client.get<SharedAccount[]>('/shared-accounts')
        ]);

        setFinancialRecords(financeResponse.data);
        setSharedAccounts(accountsResponse.data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load dashboard data.');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const totalIncome = financialRecords
    .filter((record) => record.type === 'input')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalExpenses = financialRecords
    .filter((record) => record.type === 'output')
    .reduce((sum, record) => sum + record.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Welcome back, {user?.name ?? 'Friend'} 👋</Text>
        <Text style={styles.headerSubtitle}>Here’s a quick look at your finances today.</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryGrid}>
        <SummaryCard
          title="Total Income"
          value={`$${totalIncome.toFixed(2)}`}
          color="#22c55e"
          emoji="💰"
          loading={loading}
        />
        <SummaryCard
          title="Total Expenses"
          value={`$${totalExpenses.toFixed(2)}`}
          color="#ef4444"
          emoji="💸"
          loading={loading}
        />
        <SummaryCard
          title="Net Balance"
          value={`$${netBalance.toFixed(2)}`}
          color={netBalance >= 0 ? '#22c55e' : '#ef4444'}
          emoji="📊"
          loading={loading}
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Financial Records</Text>
          <Text style={styles.sectionLink}>View all</Text>
        </View>
        {loading ? (
          <Placeholder text="Loading financial records..." />
        ) : financialRecords.length === 0 ? (
          <Placeholder text="No financial records yet. Start by adding your first record." />
        ) : (
          <View style={styles.list}>
            {financialRecords.slice(0, 5).map((record) => (
              <View key={record._id} style={styles.listItem}>
                <View>
                  <Text style={styles.listItemTitle}>{record.description}</Text>
                  <Text style={styles.listItemSubtitle}>
                    {new Date(record.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amountText,
                    { color: record.type === 'input' ? '#22c55e' : '#ef4444' }
                  ]}
                >
                  {record.type === 'input' ? '+' : '-'}${record.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shared Accounts</Text>
          <Text style={styles.sectionLink}>Manage</Text>
        </View>
        {loading ? (
          <Placeholder text="Loading shared accounts..." />
        ) : sharedAccounts.length === 0 ? (
          <Placeholder text="You haven’t created any shared accounts yet." />
        ) : (
          <View style={styles.sharedGrid}>
            {sharedAccounts.map((account) => (
              <View key={account._id} style={styles.sharedCard}>
                <Text style={styles.sharedTitle}>{account.name}</Text>
                <Text style={styles.sharedStat}>
                  👥 {account.members.length} member{account.members.length === 1 ? '' : 's'}
                </Text>
                <Text style={styles.sharedStat}>
                  🧾 {account.financeRecords.length} record
                  {account.financeRecords.length === 1 ? '' : 's'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

interface SummaryCardProps {
  title: string;
  value: string;
  color: string;
  emoji: string;
  loading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, color, emoji, loading }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryTitle}>
      {emoji} {title}
    </Text>
    <Text style={[styles.summaryValue, { color: loading ? '#9ca3af' : color }]}>
      {loading ? '—' : value}
    </Text>
  </View>
);

const Placeholder: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4ff'
  },
  content: {
    padding: 20,
    paddingBottom: 32
  },
  headerCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b'
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#475569',
    marginTop: 8
  },
  errorText: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  summaryCard: {
    flexBasis: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  sectionLink: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600'
  },
  list: {
    gap: 12
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a'
  },
  listItemSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b'
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700'
  },
  sharedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  sharedCard: {
    flexBasis: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#f8fafc'
  },
  sharedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8
  },
  sharedStat: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4
  },
  placeholder: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f8fafc'
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14
  }
});

export default DashboardScreen;
