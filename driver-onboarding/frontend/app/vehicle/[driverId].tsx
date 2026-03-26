import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { createVehicle } from '../../src/api/client';
import { colors, shared, LOGO_URI, webSelectStyle, webDateStyle } from '../../src/theme';

const YEARS = Array.from({ length: 2027 - 1990 + 1 }, (_, i) => (2027 - i).toString());

interface VehicleForm {
  make: string;
  model: string;
  year: string;
  policyNumber: string;
  expiryDate: string;
}

export default function VehicleScreen() {
  const router = useRouter();
  const { driverId } = useLocalSearchParams<{ driverId: string }>();

  const [driverName, setDriverName] = useState('');
  const [loadingDriver, setLoadingDriver] = useState(true);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isValid } } = useForm<VehicleForm>({
    mode: 'onChange',
    defaultValues: { make: '', model: '', year: '', policyNumber: '', expiryDate: '' },
  });

  useEffect(() => {
    if (!driverId) {
      router.replace('/signup');
      return;
    }
    fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/drivers/${driverId}`)
      .then((res) => res.json())
      .then((data) => { if (data.full_name) setDriverName(data.full_name); })
      .catch(() => {})
      .finally(() => setLoadingDriver(false));
  }, [driverId]);

  const onSubmit = async (data: VehicleForm) => {
    if (loading) return;
    setLoading(true);
    setApiError('');
    try {
      await createVehicle(driverId!, {
        make: data.make,
        model: data.model,
        year: parseInt(data.year, 10),
        insurance_policy_number: data.policyNumber,
        insurance_expiry: data.expiryDate,
      });
      setVehicleCount((prev) => prev + 1);
      setSuccess(true);
    } catch (err: any) {
      if (err.status === 404) {
        setApiError('Driver not found. Please sign up first.');
      } else if (err.status === 422) {
        const detail = err.detail;
        setApiError(Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : detail || 'Invalid input');
      } else {
        setApiError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    reset();
    setSuccess(false);
    setApiError('');
  };

  if (loadingDriver) {
    return (
      <View style={[shared.screenBg, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.lime} />
        <Text style={{ color: colors.neutral400, marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  const disabled = !isValid || loading;

  return (
    <ScrollView style={shared.screenBg} contentContainerStyle={shared.scrollContent}>
      <View style={shared.card}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image source={{ uri: LOGO_URI }} style={shared.logo} resizeMode="contain" />
        </View>

        {driverName ? (
          <Text style={{ color: colors.neutral400, fontSize: 16, marginBottom: 4 }}>Hi, {driverName.split(' ')[0]}!</Text>
        ) : null}

        <Text style={shared.sectionLabel}>Step 2</Text>
        <Text style={shared.heading}>REGISTER YOUR VEHICLE</Text>
        <View style={{ marginBottom: 16 }} />

        {vehicleCount > 0 && (
          <View style={shared.successBox}>
            <Text style={shared.successBoxText}>
              {vehicleCount} vehicle{vehicleCount > 1 ? 's' : ''} added
            </Text>
          </View>
        )}

        {apiError ? (
          <View style={shared.errorBox}>
            <Text style={shared.errorBoxText}>{apiError}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ fontSize: 48, color: colors.lime }}>&#10003;</Text>
            <Text style={{ color: colors.white, fontSize: 20, fontWeight: '700', marginTop: 8 }}>Vehicle added successfully!</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={shared.buttonOutline} onPress={handleAddAnother}>
                <Text style={shared.buttonOutlineText}>Add Another</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={shared.buttonPrimary}
                onPress={() =>
                  router.push({
                    pathname: '/success',
                    params: { driverName, vehicleCount: vehicleCount.toString() },
                  })
                }
              >
                <Text style={[shared.buttonPrimaryText, { paddingHorizontal: 24 }]}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Controller
              control={control}
              name="make"
              rules={{
                required: 'Vehicle make is required',
                maxLength: { value: 100, message: 'Make must be 100 characters or fewer' },
                validate: (v) => v.trim().length > 0 || 'Vehicle make is required',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={shared.fieldContainer}>
                  <Text style={shared.label}>Make</Text>
                  <TextInput
                    style={[shared.input, errors.make && shared.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Toyota, Honda, Ford"
                    placeholderTextColor={colors.neutral600}
                  />
                  {errors.make ? <Text style={shared.errorText}>{errors.make.message}</Text> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="model"
              rules={{
                required: 'Vehicle model is required',
                maxLength: { value: 100, message: 'Model must be 100 characters or fewer' },
                validate: (v) => v.trim().length > 0 || 'Vehicle model is required',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={shared.fieldContainer}>
                  <Text style={shared.label}>Model</Text>
                  <TextInput
                    style={[shared.input, errors.model && shared.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Camry, Civic, F-150"
                    placeholderTextColor={colors.neutral600}
                  />
                  {errors.model ? <Text style={shared.errorText}>{errors.model.message}</Text> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="year"
              rules={{ required: 'Year is required' }}
              render={({ field: { onChange, value } }) => (
                <View style={shared.fieldContainer}>
                  <Text style={shared.label}>Year</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={value}
                      onChange={(e: any) => onChange(e.target.value)}
                      style={webSelectStyle(!!errors.year, !!value)}
                    >
                      <option value="">Select year...</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  ) : (
                    <Text style={{ color: colors.neutral500 }}>Year picker not available</Text>
                  )}
                  {errors.year ? <Text style={shared.errorText}>{errors.year.message}</Text> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="policyNumber"
              rules={{
                required: 'Insurance policy number is required',
                maxLength: { value: 100, message: 'Policy number must be 100 characters or fewer' },
                validate: (v) => v.trim().length > 0 || 'Insurance policy number is required',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={shared.fieldContainer}>
                  <Text style={shared.label}>Insurance Policy Number</Text>
                  <TextInput
                    style={[shared.input, errors.policyNumber && shared.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. POL-123456"
                    placeholderTextColor={colors.neutral600}
                  />
                  {errors.policyNumber ? <Text style={shared.errorText}>{errors.policyNumber.message}</Text> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="expiryDate"
              rules={{
                required: 'Insurance expiry date is required',
                validate: (v) => {
                  if (!v) return 'Insurance expiry date is required';
                  const selected = new Date(v);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (selected <= today) return 'Expiry date must be in the future';
                  return true;
                },
              }}
              render={({ field: { onChange, value } }) => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const minDate = tomorrow.toISOString().split('T')[0];
                return (
                <View style={shared.fieldContainerLast}>
                  <Text style={shared.label}>Insurance Expiry Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={value}
                      min={minDate}
                      onChange={(e: any) => onChange(e.target.value)}
                      style={webDateStyle(!!errors.expiryDate)}
                    />
                  ) : (
                    <Text style={{ color: colors.neutral500 }}>Date picker not available</Text>
                  )}
                  {errors.expiryDate ? <Text style={shared.errorText}>{errors.expiryDate.message}</Text> : null}
                </View>
                );
              }}
            />

            <TouchableOpacity
              style={[shared.buttonPrimary, disabled && shared.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={disabled}
            >
              <Text style={[shared.buttonPrimaryText, disabled && shared.buttonDisabledText]}>
                {loading ? 'Adding Vehicle...' : 'Add Vehicle'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}
