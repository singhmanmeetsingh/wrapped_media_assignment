import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, shared, LOGO_URI } from '../src/theme';

export default function SuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ driverName?: string; vehicleCount?: string }>();
  const driverName = params.driverName || 'Driver';
  const vehicleCount = parseInt(params.vehicleCount || '0', 10);

  return (
    <View style={[shared.screenBg, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }]}>
      <Image source={{ uri: LOGO_URI }} style={{ width: 60, height: 42, marginBottom: 32 }} resizeMode="contain" />

      <Text style={{ fontSize: 64, color: colors.lime, marginBottom: 16 }}>&#10003;</Text>

      <Text style={[shared.heading, { textAlign: 'center', marginBottom: 8 }]}>YOU'RE ALL SET!</Text>

      <Text style={{ color: colors.lime, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>{driverName}</Text>

      {vehicleCount > 0 && (
        <Text style={{ color: colors.neutral400, fontSize: 16, marginBottom: 16 }}>
          {vehicleCount} vehicle{vehicleCount > 1 ? 's' : ''} registered
        </Text>
      )}

      <Text style={{ color: colors.neutral500, fontSize: 16, textAlign: 'center', maxWidth: 360, marginBottom: 32, lineHeight: 24 }}>
        Thank you for signing up. We'll review your information and get back to you shortly.
      </Text>

      <TouchableOpacity style={shared.buttonOutline} onPress={() => router.replace('/signup')}>
        <Text style={shared.buttonOutlineText}>Sign Up Another Driver</Text>
      </TouchableOpacity>
    </View>
  );
}
