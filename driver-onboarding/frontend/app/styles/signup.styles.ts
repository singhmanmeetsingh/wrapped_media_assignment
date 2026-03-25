import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 28,
  },
  apiErrorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  apiError: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#334155',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});

export const selectStyle = (hasError: boolean, hasValue: boolean) => ({
  width: '100%' as const,
  minHeight: 48,
  border: `${hasError ? '2px' : '1px'} solid ${hasError ? '#ef4444' : '#d1d5db'}`,
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 16,
  backgroundColor: '#fff',
  color: hasValue ? '#1e293b' : '#94a3b8',
});
