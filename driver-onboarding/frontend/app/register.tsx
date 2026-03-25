import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import FormInput from '../src/components/FormInput';
import { registerUser, setAuthToken } from '../src/api/client';
import { styles } from './styles/auth.styles';
import { useAppDispatch } from '../src/store/hooks';
import { setToken } from '../src/store/slices/authSlice';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch, formState: { errors, isValid } } = useForm<RegisterForm>({
    mode: 'onChange',
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (loading) return;
    setLoading(true);
    setApiError('');
    try {
      const result = await registerUser({ email: data.email, password: data.password });
      setAuthToken(result.access_token);
      dispatch(setToken(result.access_token));
      router.replace('/dashboard');
    } catch (err: any) {
      if (err.status === 409) {
        setApiError('Email already registered');
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Register</Text>
        <Text style={styles.subtitle}>Create an account to access the dashboard</Text>

        {apiError ? (
          <View style={styles.apiErrorBox}>
            <Text style={styles.apiError}>{apiError}</Text>
          </View>
        ) : null}

        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
              message: 'Please enter a valid email',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="admin@example.com"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{
            required: 'Password is required',
            minLength: { value: 6, message: 'Password must be at least 6 characters' },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry
              placeholder="At least 6 characters"
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: 'Please confirm your password',
            validate: (v) => v === password || 'Passwords do not match',
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Confirm Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              secureTextEntry
              placeholder="Repeat password"
            />
          )}
        />

        <TouchableOpacity
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Register'}</Text>
        </TouchableOpacity>

        <Link href="/login" style={styles.link}>
          Already have an account? Sign in
        </Link>
      </View>
    </ScrollView>
  );
}
