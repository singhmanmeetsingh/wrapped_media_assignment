import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import FormInput from '../../src/components/FormInput';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { createVehicle } from '../../src/api/client';
import { styles, selectStyle, dateInputStyle } from '../styles/vehicle.styles';

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

  if (loadingDriver) return <LoadingSpinner message="Loading..." />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {driverName ? (
          <Text style={styles.greeting}>Hi, {driverName.split(' ')[0]}!</Text>
        ) : null}
        <Text style={styles.title}>Register Your Vehicle</Text>
        {vehicleCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {vehicleCount} vehicle{vehicleCount > 1 ? 's' : ''} added
            </Text>
          </View>
        )}

        {apiError ? (
          <View style={styles.apiErrorBox}>
            <Text style={styles.apiError}>{apiError}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>&#10003;</Text>
            <Text style={styles.successText}>Vehicle added successfully!</Text>
            <View style={styles.successButtons}>
              <TouchableOpacity style={styles.outlineButton} onPress={handleAddAnother}>
                <Text style={styles.outlineButtonText}>Add Another Vehicle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() =>
                  router.push({
                    pathname: '/success',
                    params: { driverName, vehicleCount: vehicleCount.toString() },
                  })
                }
              >
                <Text style={styles.buttonText}>Finish</Text>
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
                validate: (v) => v.trim().length > 0 || 'Vehicle make is required',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Make"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.make?.message}
                  placeholder="e.g. Toyota, Honda, Ford"
                />
              )}
            />

            <Controller
              control={control}
              name="model"
              rules={{
                required: 'Vehicle model is required',
                validate: (v) => v.trim().length > 0 || 'Vehicle model is required',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Model"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.model?.message}
                  placeholder="e.g. Camry, Civic, F-150"
                />
              )}
            />

            <Controller
              control={control}
              name="year"
              rules={{ required: 'Year is required' }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Year</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={value}
                      onChange={(e: any) => onChange(e.target.value)}
                      style={selectStyle(!!errors.year, !!value)}
                    >
                      <option value="">Select year...</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  ) : (
                    <Text>Year picker not available</Text>
                  )}
                  {errors.year ? (
                    <Text style={styles.fieldError}>{errors.year.message}</Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="policyNumber"
              rules={{
                required: 'Insurance policy number is required',
                validate: (v) => v.trim().length > 0 || 'Insurance policy number is required',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Insurance Policy Number"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.policyNumber?.message}
                  placeholder="e.g. POL-123456"
                />
              )}
            />

            <Controller
              control={control}
              name="expiryDate"
              rules={{ required: 'Insurance expiry date is required' }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Insurance Expiry Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={value}
                      onChange={(e: any) => onChange(e.target.value)}
                      style={dateInputStyle(!!errors.expiryDate)}
                    />
                  ) : (
                    <Text>Date picker not available</Text>
                  )}
                  {errors.expiryDate ? (
                    <Text style={styles.fieldError}>{errors.expiryDate.message}</Text>
                  ) : null}
                </View>
              )}
            />

            <TouchableOpacity
              style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Adding Vehicle...' : 'Add Vehicle'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}
