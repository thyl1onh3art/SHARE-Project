import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import client from '../api/client';

type SharedAccount = {
  _id: string;
  name: string;
  owner: string;
  members: string[];
  financeRecords: any[];
  createdAt: string;
};

const SharedAccountsScreen: React.FC = () => {
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    memberIds: ''
  });

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SharedAccount | null>(null);
  const [inviteForm, setInviteForm] = useState({
    recipientEmail: '',
    recipientPhone: ''
  });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await client.get<SharedAccount[]>('/shared-accounts');
      setAccounts(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load shared accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  const handleCreateAccount = async () => {
    if (!formData.name.trim()) {
      setError('Please provide a name for the shared account.');
      return;
    }

    setFormSubmitting(true);
    setError('');

    try {
      const memberIds = formData.memberIds
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      await client.post('/shared-accounts', {
        name: formData.name.trim(),
        memberIds
      });

      setFormData({ name: '', memberIds: '' });
      setFormVisible(false);
      await loadAccounts();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Unable to create shared account.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenInviteModal = (account: SharedAccount) => {
    setSelectedAccount(account);
    setInviteForm({ recipientEmail: '', recipientPhone: '' });
    setInviteModalVisible(true);
  };

  const handleSendInvite = async () => {
    if (!selectedAccount) {
      return;
    }

    if (!inviteForm.recipientEmail.trim() && !inviteForm.recipientPhone.trim()) {
      setError('Please provide at least an email or phone number to send an invite.');
      return;
    }

    setInviteSubmitting(true);
    setError('');

    try {
      await client.post('/invites/send', {
        sharedAccountId: selectedAccount._id,
        recipientEmail: inviteForm.recipientEmail.trim() || undefined,
        recipientPhone: inviteForm.recipientPhone.trim() || undefined
      });

      setInviteModalVisible(false);
      setInviteForm({ recipientEmail: '', recipientPhone: '' });
      Alert.alert('Success', 'Invitation sent successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const totals = useMemo(() => {
    const totalMembers = accounts.reduce((sum, account) => sum + account.members.length, 0);
    const totalRecords = accounts.reduce((sum, account) => sum + account.financeRecords.length, 0);

    return {
      accounts: accounts.length,
      members: totalMembers,
      records: totalRecords
    };
  }, [accounts]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Shared Accounts</Text>
          <Text style={styles.subtitle}>
            Collaborate with partners, family or friends on shared budgets.
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setFormVisible((prev) => !prev)}>
          <Text style={styles.primaryButtonText}>{formVisible ? 'Cancel' : 'Create'}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryGrid}>
        <SummaryCard label="Total Accounts" value={totals.accounts} color="#6366f1" emoji="📁" />
        <SummaryCard label="Total Members" value={totals.members} color="#22c55e" emoji="👥" />
        <SummaryCard label="Total Records" value={totals.records} color="#ef4444" emoji="🧾" />
      </View>

      {formVisible ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create New Shared Account</Text>

          <View style={styles.formField}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Roommate Expenses"
              value={formData.name}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, name: value }))}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Member IDs (comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              value={formData.memberIds}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, memberIds: value }))}
            />
            <Text style={styles.helperText}>
              You can invite members later with their email or phone number.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, formSubmitting && styles.submitButtonDisabled]}
            onPress={handleCreateAccount}
            disabled={formSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {formSubmitting ? 'Creating...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.accountsCard}>
        <Text style={styles.accountsTitle}>Your Shared Accounts</Text>

        {loading ? (
          <Placeholder text="Loading shared accounts..." />
        ) : accounts.length === 0 ? (
          <Placeholder text="No shared accounts yet. Create one to start collaborating!" />
        ) : (
          <View style={styles.accountsGrid}>
            {accounts.map((account) => (
              <View key={account._id} style={styles.accountCard}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountMeta}>
                  Owner: <Text style={styles.accountMetaBold}>{account.owner}</Text>
                </Text>
                <Text style={styles.accountMeta}>
                  Members: <Text style={styles.accountMetaBold}>{account.members.length}</Text>
                </Text>
                <Text style={styles.accountMeta}>
                  Records:{' '}
                  <Text style={styles.accountMetaBold}>{account.financeRecords.length}</Text>
                </Text>
                <Text style={styles.accountMeta}>
                  Created: {new Date(account.createdAt).toLocaleDateString()}
                </Text>

                <View style={styles.accountActions}>
                  <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={() => handleOpenInviteModal(account)}
                  >
                    <Text style={styles.outlineButtonText}>Invite</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={() =>
                      Alert.alert(
                        'Delete Shared Account',
                        'Deleting shared accounts is not supported yet.'
                      )
                    }
                  >
                    <Text style={styles.dangerButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal animationType="slide" transparent visible={inviteModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invite to {selectedAccount?.name}</Text>
            <Text style={styles.modalSubtitle}>
              Send an invitation by email or phone number.
            </Text>

            <View style={styles.formField}>
              <Text style={styles.label}>Recipient Email</Text>
              <TextInput
                style={styles.input}
                placeholder="friend@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={inviteForm.recipientEmail}
                onChangeText={(value) =>
                  setInviteForm((prev) => ({ ...prev, recipientEmail: value }))
                }
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Recipient Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+1234567890"
                keyboardType="phone-pad"
                value={inviteForm.recipientPhone}
                onChangeText={(value) =>
                  setInviteForm((prev) => ({ ...prev, recipientPhone: value }))
                }
              />
            </View>

            <Text style={styles.helperText}>
              Provide at least one contact method to send the invitation.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => {
                  setInviteModalVisible(false);
                  setInviteForm({ recipientEmail: '', recipientPhone: '' });
                  setSelectedAccount(null);
                }}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, inviteSubmitting && styles.submitButtonDisabled]}
                onPress={handleSendInvite}
                disabled={inviteSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
  emoji: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, color, emoji }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>
      {emoji} {label}
    </Text>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
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
    flexBasis: '30%',
    minWidth: 110,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6
  },
  summaryLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600'
  },
  summaryValue: {
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
  formField: {
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  helperText: {
    fontSize: 12,
    color: '#64748b'
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
    fontWeight: '600',
    fontSize: 16
  },
  accountsCard: {
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
  accountsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  accountsGrid: {
    gap: 16
  },
  accountCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    gap: 8
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  accountMeta: {
    fontSize: 13,
    color: '#475569'
  },
  accountMetaBold: {
    fontWeight: '700'
  },
  accountActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  outlineButtonText: {
    color: '#4f46e5',
    fontWeight: '600'
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  dangerButtonText: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    gap: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#475569'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8
  }
});

export default SharedAccountsScreen;
