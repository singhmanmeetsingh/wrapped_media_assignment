import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import FormInput from '../src/components/FormInput';
import { createDriver } from '../src/api/client';
import { styles, selectStyle } from './styles/signup.styles';

const CA_PROVINCES = [
  'Alberta','British Columbia','Manitoba','New Brunswick',
  'Newfoundland and Labrador','Northwest Territories','Nova Scotia',
  'Nunavut','Ontario','Prince Edward Island','Quebec',
  'Saskatchewan','Yukon',
];

interface SignUpForm {
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseState: string;
}

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string }>();
  const [ref, setRef] = useState<string | undefined>(undefined);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors, isValid } } = useForm<SignUpForm>({
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      licenseNumber: '',
      licenseState: '',
    },
  });

  useEffect(() => {
    if (params.ref) {
      setRef(params.ref);
    } else if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');
      if (refParam) setRef(refParam);
    }
  }, [params.ref]);

  const onSubmit = async (data: SignUpForm) => {
    if (loading) return;
    setLoading(true);
    setApiError('');
    try {
      const driver = await createDriver({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        license_number: data.licenseNumber,
        license_state: data.licenseState,
        ref,
      });
      router.push(`/vehicle/${driver.id}`);
    } catch (err: any) {
      if (err.status === 409) {
        setApiError('This email is already registered.');
      } else if (err.status === 422) {
        const detail = err.detail;
        if (Array.isArray(detail)) {
          setApiError(detail.map((d: any) => d.msg).join(', '));
        } else {
          setApiError(detail || 'Invalid input');
        }
      } else {
        setApiError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Driver Sign Up</Text>
        <Text style={styles.subtitle}>Join our driver network today</Text>

        {apiError ? (
          <View style={styles.apiErrorBox}>
            <Text style={styles.apiError}>{apiError}</Text>
          </View>
        ) : null}

        <Controller
          control={control}
          name="fullName"
          rules={{
            required: 'Full name is required',
            maxLength: { value: 255, message: 'Name is too long' },
            validate: (v) => v.trim().length > 0 || 'Full name is required',
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Full Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.fullName?.message}
              placeholder="John Doe"
              autoComplete="name"
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
              message: 'Please enter a valid email address',
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
              autoComplete="email"
              placeholder="john@example.com"
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          rules={{
            required: 'Phone number is required',
            validate: (v) => {
              const digits = v.replace(/\D/g, '');
              if (digits.length < 10) return 'Phone number must have at least 10 digits';
              if (digits.length > 15) return 'Phone number is too long';
              return true;
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Phone Number"
              value={value}
              onChangeText={(v) => onChange(v.replace(/[^0-9+\-() ]/g, ''))}
              onBlur={onBlur}
              error={errors.phone?.message}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+1 (555) 123-4567"
            />
          )}
        />

        <Controller
          control={control}
          name="licenseNumber"
          rules={{
            required: 'License number is required',
            validate: (v) => v.trim().length > 0 || 'License number is required',
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Driver's License Number"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.licenseNumber?.message}
              placeholder="DL-123456"
            />
          )}
        />

        <Controller
          control={control}
          name="licenseState"
          rules={{ required: 'Province/territory is required' }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>License Province/Territory</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={value}
                  onChange={(e: any) => onChange(e.target.value)}
                  style={selectStyle(!!errors.licenseState, !!value)}
                >
                  <option value="">Select province/territory...</option>
                  {CA_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <Text>Dropdown not available</Text>
              )}
              {errors.licenseState ? (
                <Text style={styles.fieldError}>{errors.licenseState.message}</Text>
              ) : null}
            </View>
          )}
        />

        <TouchableOpacity
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Continue to Vehicle Registration'}</Text>
        </TouchableOpacity>

        <Link href="/login" style={styles.link}>
          Admin? Sign in to dashboard
        </Link>
      </View>
    </ScrollView>
  );
}
