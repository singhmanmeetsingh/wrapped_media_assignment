import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const CA_PROVINCES = [
  'Alberta','British Columbia','Manitoba','New Brunswick',
  'Newfoundland and Labrador','Northwest Territories','Nova Scotia',
  'Nunavut','Ontario','Prince Edward Island','Quebec',
  'Saskatchewan','Yukon',
];

interface StateDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  error?: string | null;
}

export default function StateDropdown({ value, onValueChange, error }: StateDropdownProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>License Province/Territory</Text>
        <select
          value={value}
          onChange={(e: any) => onValueChange(e.target.value)}
          style={{
            width: '100%',
            minHeight: 44,
            border: `1px solid ${error ? '#e53e3e' : '#ccc'}`,
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 16,
            backgroundColor: '#fff',
          }}
        >
          <option value="">Select province/territory...</option>
          {CA_PROVINCES.map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>License Province/Territory</Text>
      <Text>Dropdown not available on this platform</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  error: {
    color: '#e53e3e',
    fontSize: 12,
    marginTop: 4,
  },
});
