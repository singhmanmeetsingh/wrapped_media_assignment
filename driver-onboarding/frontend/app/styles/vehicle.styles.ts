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
  greeting: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  countBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  countText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
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
  successBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 28,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  successIcon: {
    fontSize: 48,
    color: '#16a34a',
    marginBottom: 12,
  },
  successText: {
    fontSize: 18,
    color: '#15803d',
    fontWeight: '600',
    marginBottom: 24,
  },
  successButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  outlineButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
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

export const dateInputStyle = (hasError: boolean) => ({
  width: '100%',
  minHeight: 48,
  border: `${hasError ? '2px' : '1px'} solid ${hasError ? '#ef4444' : '#d1d5db'}`,
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 16,
  backgroundColor: '#fff',
  boxSizing: 'border-box' as const,
});
