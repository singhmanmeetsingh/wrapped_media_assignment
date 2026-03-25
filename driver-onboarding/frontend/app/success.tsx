import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { styles } from './styles/success.styles';

export default function SuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ driverName?: string; vehicleCount?: string }>();
  const driverName = params.driverName || 'Driver';
  const vehicleCount = parseInt(params.vehicleCount || '0', 10);

  return (
    <View style={styles.container}>
      <Text style={styles.checkmark}>&#10003;</Text>
      <Text style={styles.title}>You're All Set!</Text>
      <Text style={styles.name}>{driverName}</Text>
      {vehicleCount > 0 && (
        <Text style={styles.detail}>
          {vehicleCount} vehicle{vehicleCount > 1 ? 's' : ''} registered
        </Text>
      )}
      <Text style={styles.message}>
        Thank you for signing up. We'll review your information and get back to you shortly.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/signup')}>
        <Text style={styles.buttonText}>Sign Up Another Driver</Text>
      </TouchableOpacity>
    </View>
  );
}
