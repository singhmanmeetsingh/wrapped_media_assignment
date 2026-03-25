import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import FormInput from '../src/components/FormInput';
import { loginUser, setAuthToken } from '../src/api/client';
import { styles } from './styles/auth.styles';
import { useAppDispatch } from '../src/store/hooks';
import { setToken } from '../src/store/slices/authSlice';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors, isValid } } = useForm<LoginForm>({
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    if (loading) return;
    setLoading(true);
    setApiError('');
    try {
      const result = await loginUser(data);
      setAuthToken(result.access_token);
      dispatch(setToken(result.access_token));
      router.replace('/dashboard');
    } catch (err: any) {
      if (err.status === 401) {
        setApiError('Invalid email or password');
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
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>Sign in to access the dashboard</Text>

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
          rules={{ required: 'Password is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry
              placeholder="Enter password"
            />
          )}
        />

        <TouchableOpacity
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <Link href="/register" style={styles.link}>
          Don't have an account? Register
        </Link>
      </View>
    </ScrollView>
  );
}
