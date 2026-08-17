import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import client from '../api/client';

type FinancialRecord = {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  description: string;
  date: string;
};

const createInitialFormState = () => ({
  type: 'output' as 'input' | 'output',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0]
});

const FinancialRecordsScreen: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState(createInitialFormState());

  const loadRecords = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError('');

      try {
        const { data } = await client.get<FinancialRecord[]>('/finance');
        setRecords(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load financial records.');
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
      loadRecords();
    }, [loadRecords])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords(true);
    setRefreshing(false);
  }, [loadRecords]);

  const summary = useMemo(() => {
    const totalIncome = records
      .filter((record) => record.type === 'input')
      .reduce((sum, record) => sum + record.amount, 0);
    const totalExpenses = records
      .filter((record) => record.type === 'output')
      .reduce((sum, record) => sum + record.amount, 0);
    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses
    };
  }, [records]);

  const handleSubmit = async () => {
    if (!formState.amount || !formState.description || !formState.date) {
      setError('Please complete the form before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await client.post('/finance', {
        type: formState.type,
        amount: parseFloat(formState.amount),
        description: formState.description,
        date: new Date(formState.date).toISOString()
      });

      setFormState(createInitialFormState());
      setFormVisible(false);
      await loadRecords();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Unable to create financial record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (recordId: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this financial record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/finance/${recordId}`);
              await loadRecords();
            } catch (err: any) {
              setError(err?.response?.data?.message ?? 'Failed to delete the record.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Financial Records</Text>
          <Text style={styles.subtitle}>Track your income and expenses in one place.</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setFormVisible((prev) => !prev)}>
          <Text style={styles.primaryButtonText}>{formVisible ? 'Cancel' : 'Add Record'}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryGrid}>
        <SummaryCard
          title="Total Income"
          amount={summary.totalIncome}
          color="#22c55e"
          emoji="💰"
          loading={loading}
        />
        <SummaryCard
          title="Total Expenses"
          amount={summary.totalExpenses}
          color="#ef4444"
          emoji="💸"
          loading={loading}
        />
        <SummaryCard
          title="Net Balance"
          amount={summary.netBalance}
          color={summary.netBalance >= 0 ? '#22c55e' : '#ef4444'}
          emoji="📊"
          loading={loading}
        />
      </View>

      {formVisible ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add New Record</Text>

          <View style={styles.toggleGroup}>
            {(['output', 'input'] as const).map((option) => {
              const selected = formState.type === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.toggleChip, selected && styles.toggleChipSelected]}
                  onPress={() => setFormState((prev) => ({ ...prev, type: option }))}
                >
                  <Text
                    style={[
                      styles.toggleChipText,
                      selected && styles.toggleChipTextSelected
                    ]}
                  >
                    {option === 'input' ? 'Income' : 'Expense'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={formState.amount}
              onChangeText={(value) => setFormState((prev) => ({ ...prev, amount: value }))}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="What was this for?"
              value={formState.description}
              onChangeText={(value) => setFormState((prev) => ({ ...prev, description: value }))}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formState.date}
              onChangeText={(value) => setFormState((prev) => ({ ...prev, date: value }))}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Saving...' : 'Save Record'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.recordsCard}>
        <Text style={styles.recordsTitle}>All Records</Text>

        {loading ? (
          <Placeholder text="Loading financial records..." />
        ) : records.length === 0 ? (
          <Placeholder text="No financial records yet. Add your first record above!" />
        ) : (
          <View style={styles.list}>
            {records.map((record) => (
              <View key={record._id} style={styles.listItem}>
                <View>
                  <Text style={styles.listItemTitle}>{record.description}</Text>
                  <Text style={styles.listItemSubtitle}>
                    {new Date(record.date).toLocaleDateString()} •{' '}
                    {record.type === 'input' ? 'Income' : 'Expense'}
                  </Text>
                </View>
                <View style={styles.listItemActions}>
                  <Text
                    style={[
                      styles.amountText,
                      { color: record.type === 'input' ? '#22c55e' : '#ef4444' }
                    ]}
                  >
                    {record.type === 'input' ? '+' : '-'}${record.amount.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(record._id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
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
  amount: number;
  color: string;
  emoji: string;
  loading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, color, emoji, loading }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryTitle}>
      {emoji} {title}
    </Text>
    <Text style={[styles.summaryAmount, { color: loading ? '#9ca3af' : color }]}>
      {loading ? '—' : `$${amount.toFixed(2)}`}
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
    paddingBottom: 40,
    gap: 20
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b'
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  errorText: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 12
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  summaryCard: {
    flexBasis: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6
  },
  summaryTitle: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600'
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 12
  },
  toggleChip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc'
  },
  toggleChipSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5'
  },
  toggleChipText: {
    color: '#475569',
    fontWeight: '600'
  },
  toggleChipTextSelected: {
    color: 'white'
  },
  formField: {
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb'
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  recordsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6
  },
  recordsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  list: {
    gap: 12
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    gap: 12
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a'
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700'
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999
  },
  deleteButtonText: {
    color: '#ef4444',
    fontWeight: '600'
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

export default FinancialRecordsScreen;
