import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const AGE_GROUPS = [
  { label: '16-20', value: '16-20', age: 18 },
  { label: '21-25', value: '21-25', age: 23 },
  { label: '26-30', value: '26-30', age: 28 },
  { label: '31-35', value: '31-35', age: 33 },
  { label: '36-40', value: '36-40', age: 38 },
  { label: '40+', value: '40+', age: 45 }
];

const INTERESTS = [
  'Finance',
  'Technology',
  'Travel',
  'Sports',
  'Music',
  'Art',
  'Cooking',
  'Reading',
  'Gaming',
  'Fitness',
  'Photography',
  'Movies'
];

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ageGroup, setAgeGroup] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSubmittingDisabled = useMemo(() => {
    return (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword ||
      !ageGroup ||
      password.length < 6 ||
      password !== confirmPassword
    );
  }, [name, email, password, confirmPassword, ageGroup]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const handleRegister = async () => {
    if (isSubmittingDisabled) {
      setError('Please complete the form before continuing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedAge = AGE_GROUPS.find((group) => group.value === ageGroup)?.age ?? 25;
      await register(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        selectedAge,
        selectedInterests
      );

      navigation.navigate('Login');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join SHARE Project and start collaborating</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Age Group</Text>
            <View style={styles.choicesGrid}>
              {AGE_GROUPS.map((group) => {
                const selected = ageGroup === group.value;
                return (
                  <TouchableOpacity
                    key={group.value}
                    style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                    onPress={() => setAgeGroup(group.value)}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                      {group.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Interests</Text>
            <View style={styles.choicesGrid}>
              {INTERESTS.map((interest) => {
                const selected = selectedInterests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                    onPress={() => toggleInterest(interest)}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                      {interest}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Minimum 6 characters"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Text style={styles.toggleButtonText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Re-enter your password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                textContentType="password"
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowConfirmPassword((prev) => !prev)}
              >
                <Text style={styles.toggleButtonText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (loading || isSubmittingDisabled) && styles.primaryButtonDisabled]}
            onPress={handleRegister}
            disabled={loading || isSubmittingDisabled}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff'
  },
  content: {
    flexGrow: 1,
    padding: 24
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937'
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8
  },
  errorText: {
    marginTop: 16,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    color: '#b91c1c'
  },
  fieldGroup: {
    marginTop: 20
  },
  label: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb'
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f9fafb'
  },
  choiceChipSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5'
  },
  choiceChipText: {
    color: '#4b5563',
    fontWeight: '600'
  },
  choiceChipTextSelected: {
    color: 'white'
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1
  },
  toggleButton: {
    marginLeft: 12,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  toggleButtonText: {
    color: '#4f46e5',
    fontWeight: '600'
  },
  primaryButton: {
    marginTop: 28,
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryButtonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  footerText: {
    color: '#6b7280',
    marginRight: 6
  },
  footerLink: {
    color: '#4f46e5',
    fontWeight: '600'
  }
});

export default RegisterScreen;
