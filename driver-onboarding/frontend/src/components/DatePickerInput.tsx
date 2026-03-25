import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface DatePickerInputProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  error?: string | null;
}

export default function DatePickerInput({ label, value, onChange, error }: DatePickerInputProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            borderWidth: 1,
            borderColor: error ? '#e53e3e' : '#ccc',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 16,
            minHeight: 44,
            backgroundColor: '#fff',
            borderStyle: 'solid',
            width: '100%',
            boxSizing: 'border-box' as const,
          }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.placeholder}>Date picker not available on this platform</Text>
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
  placeholder: {
    color: '#999',
    fontSize: 14,
  },
  error: {
    color: '#e53e3e',
    fontSize: 12,
    marginTop: 4,
  },
});
