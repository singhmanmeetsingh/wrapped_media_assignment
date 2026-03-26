import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { registerUser, setAuthToken } from '../src/api/client';
import { useAppDispatch } from '../src/store/hooks';
import { setToken } from '../src/store/slices/authSlice';
import { colors, shared, LOGO_URI } from '../src/theme';

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

  const disabled = !isValid || loading;

  return (
    <ScrollView style={shared.screenBg} contentContainerStyle={shared.scrollContent}>
      <View style={shared.card}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image source={{ uri: LOGO_URI }} style={shared.logo} resizeMode="contain" />
        </View>

        <Text style={shared.heading}>CREATE ACCOUNT</Text>
        <Text style={shared.subtitle}>Register to access the campaign dashboard</Text>

        {apiError ? (
          <View style={shared.errorBox}>
            <Text style={shared.errorBoxText}>{apiError}</Text>
          </View>
        ) : null}

        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: { value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: 'Please enter a valid email' },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={shared.fieldContainer}>
              <Text style={shared.label}>Email</Text>
              <TextInput
                style={[shared.input, errors.email && shared.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="admin@example.com"
                placeholderTextColor={colors.neutral600}
              />
              {errors.email ? <Text style={shared.errorText}>{errors.email.message}</Text> : null}
            </View>
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
            <View style={shared.fieldContainer}>
              <Text style={shared.label}>Password</Text>
              <TextInput
                style={[shared.input, errors.password && shared.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                placeholder="At least 6 characters"
                placeholderTextColor={colors.neutral600}
              />
              {errors.password ? <Text style={shared.errorText}>{errors.password.message}</Text> : null}
            </View>
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
            <View style={shared.fieldContainerLast}>
              <Text style={shared.label}>Confirm Password</Text>
              <TextInput
                style={[shared.input, errors.confirmPassword && shared.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                placeholder="Repeat password"
                placeholderTextColor={colors.neutral600}
              />
              {errors.confirmPassword ? <Text style={shared.errorText}>{errors.confirmPassword.message}</Text> : null}
            </View>
          )}
        />

        <TouchableOpacity
          style={[shared.buttonPrimary, disabled && shared.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={disabled}
        >
          <Text style={[shared.buttonPrimaryText, disabled && shared.buttonDisabledText]}>
            {loading ? 'Creating account...' : 'Register'}
          </Text>
        </TouchableOpacity>

        <Link href="/login" style={{ marginTop: 20, alignSelf: 'center' }}>
          <Text style={shared.linkText}>Already have an account? Sign in</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
