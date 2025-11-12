import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';

const SettingsScreen: React.FC = () => {
  const { logout, deleteAccount } = useAuth();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm.');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await deleteAccount();
      Alert.alert('Account deleted', 'Your account has been removed successfully.');
      setDeleteModalVisible(false);
      setDeleteConfirmText('');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Account Settings</Text>
        <Text style={styles.heroSubtitle}>
          Manage your security preferences, privacy controls and account status.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Security</Text>
        <Text style={styles.sectionSubtitle}>
          Keep your account protected with strong, unique credentials.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Alert.alert('Coming soon', 'Password management is handled on the web.')}
          >
            <Text style={styles.secondaryButtonText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Alert.alert('Coming soon', 'Two-factor settings are handled on the web.')}
          >
            <Text style={styles.secondaryButtonText}>Two-Factor Auth</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.sectionSubtitle}>
          Control who can see your data and export your information for backup.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Alert.alert('Coming soon', 'Data export will be available in a future update.')}
          >
            <Text style={styles.secondaryButtonText}>Data Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Alert.alert('Coming soon', 'Privacy controls will be available in a future update.')}
          >
            <Text style={styles.secondaryButtonText}>Privacy Controls</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.sectionCard, styles.dangerSection]}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <Text style={styles.sectionSubtitle}>
          Permanently delete your account and all associated data. This action cannot be reversed.
        </Text>
        <TouchableOpacity style={styles.dangerButton} onPress={() => setDeleteModalVisible(true)}>
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={deleteModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalSubtitle}>
              This will remove your profile, financial records and shared account memberships.
            </Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ This action cannot be undone.</Text>
            </View>

            <Text style={styles.modalInstructions}>
              To confirm, type <Text style={styles.modalHighlight}>DELETE</Text> below:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Type DELETE to confirm"
              autoCapitalize="characters"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText('');
                  setError('');
                }}
                disabled={deleting}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dangerButton,
                  (deleting || deleteConfirmText !== 'DELETE') && styles.dangerButtonDisabled
                ]}
                onPress={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
              >
                <Text style={styles.dangerButtonText}>
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

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
  heroCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b'
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#475569'
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#475569'
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexGrow: 1,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#4f46e5',
    fontWeight: '600'
  },
  dangerSection: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2'
  },
  dangerButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  dangerButtonDisabled: {
    opacity: 0.7
  },
  dangerButtonText: {
    color: 'white',
    fontWeight: '700'
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'white'
  },
  logoutButtonText: {
    color: '#1e293b',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    gap: 16
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#b91c1c'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#475569'
  },
  warningBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12
  },
  warningText: {
    color: '#b91c1c',
    fontWeight: '600'
  },
  modalInstructions: {
    fontSize: 14,
    color: '#475569'
  },
  modalHighlight: {
    fontWeight: '700',
    color: '#1e293b'
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff1f2',
    fontSize: 16,
    color: '#b91c1c'
  },
  errorText: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: 10,
    borderRadius: 10
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  }
});

export default SettingsScreen;
