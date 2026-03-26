import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { createDriver, validateInvitation, declineInvitation } from '../src/api/client';
import { colors, shared, LOGO_URI, webSelectStyle } from '../src/theme';

const CA_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon',
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
  const params = useLocalSearchParams<{ token?: string }>();
  const [invitationToken, setInvitationToken] = useState<string | undefined>(undefined);
  const [campaignRef, setCampaignRef] = useState<string | undefined>(undefined);
  const [campaignName, setCampaignName] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');
  const [validating, setValidating] = useState(true);
  const [invalidToken, setInvalidToken] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);

  const { control, handleSubmit, setValue, formState: { errors, isValid } } = useForm<SignUpForm>({
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', phone: '', licenseNumber: '', licenseState: '' },
  });

  useEffect(() => {
    let token: string | undefined;
    if (params.token) {
      token = params.token;
    } else if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      token = urlParams.get('token') || undefined;
    }

    if (!token) {
      setInvalidToken('You need an invitation link to sign up. Please contact an admin.');
      setValidating(false);
      return;
    }

    setInvitationToken(token);
    validateInvitation(token)
      .then((data) => {
        setCampaignRef(data.campaign_ref || undefined);
        setCampaignName(data.campaign_name || '');
        setPrefillEmail(data.email);
        setValue('email', data.email);
      })
      .catch((err) => {
        if (err.status === 410) {
          const detail = err.detail || '';
          if (detail.includes('declined')) {
            setInvalidToken('This invitation has been declined.');
          } else {
            setInvalidToken('This invitation has already been used.');
          }
        } else {
          setInvalidToken('Invalid invitation link. Please contact an admin for a new one.');
        }
      })
      .finally(() => setValidating(false));
  }, [params.token]);

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
        ref: campaignRef,
        invitation_token: invitationToken,
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

  const onDecline = async () => {
    if (declining || !invitationToken) return;
    setDeclining(true);
    setApiError('');
    try {
      await declineInvitation(invitationToken);
      setDeclined(true);
    } catch (err: any) {
      setApiError(err.detail || 'Failed to decline invitation.');
    } finally {
      setDeclining(false);
    }
  };

  if (validating) {
    return (
      <View style={[shared.screenBg, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.lime} />
        <Text style={{ color: colors.neutral400, marginTop: 16 }}>Validating invitation...</Text>
      </View>
    );
  }

  if (declined) {
    return (
      <ScrollView style={shared.screenBg} contentContainerStyle={shared.scrollContent}>
        <View style={shared.card}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Image source={{ uri: LOGO_URI }} style={shared.logo} resizeMode="contain" />
          </View>
          <Text style={{ fontSize: 48, color: colors.neutral400, textAlign: 'center', marginBottom: 16 }}>&#10005;</Text>
          <Text style={[shared.heading, { textAlign: 'center' }]}>INVITATION DECLINED</Text>
          <Text style={{ color: colors.neutral400, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            You have declined this invitation. If this was a mistake, please contact the admin for a new invitation link.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (invalidToken) {
    return (
      <ScrollView style={shared.screenBg} contentContainerStyle={shared.scrollContent}>
        <View style={shared.card}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Image source={{ uri: LOGO_URI }} style={shared.logo} resizeMode="contain" />
          </View>
          <Text style={shared.heading}>SIGN UP</Text>
          <View style={[shared.errorBox, { marginTop: 12 }]}>
            <Text style={shared.errorBoxText}>{invalidToken}</Text>
          </View>
          <Link href="/login" style={{ alignSelf: 'center', marginTop: 8 }}>
            <Text style={shared.linkText}>Admin? Sign in to dashboard</Text>
          </Link>
        </View>
      </ScrollView>
    );
  }

  const disabled = !isValid || loading;

  return (
    <ScrollView style={shared.screenBg} contentContainerStyle={shared.scrollContent}>
      <View style={shared.card}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image source={{ uri: LOGO_URI }} style={shared.logo} resizeMode="contain" />
        </View>

        <Text style={shared.sectionLabel}>For Drivers</Text>
        <Text style={shared.heading}>DRIVER SIGN UP</Text>
        <Text style={shared.subtitle}>Join our driver network today</Text>

        {campaignName ? (
          <View style={shared.successBox}>
            <Text style={shared.successBoxText}>Campaign: {campaignName}</Text>
          </View>
        ) : null}

        {apiError ? (
          <View style={shared.errorBox}>
            <Text style={shared.errorBoxText}>{apiError}</Text>
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
            <View style={shared.fieldContainer}>
              <Text style={shared.label}>Full Name</Text>
              <TextInput
                style={[shared.input, errors.fullName && shared.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="John Doe"
                placeholderTextColor={colors.neutral600}
                autoComplete="name"
              />
              {errors.fullName ? <Text style={shared.errorText}>{errors.fullName.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: { value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: 'Please enter a valid email address' },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={shared.fieldContainer}>
              <Text style={shared.label}>Email</Text>
              <TextInput
                style={[shared.input, errors.email && shared.inputError, prefillEmail ? { opacity: 0.6 } : undefined]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="john@example.com"
                placeholderTextColor={colors.neutral600}
                editable={!prefillEmail}
              />
              {errors.email ? <Text style={shared.errorText}>{errors.email.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="phone"
          rules={{
            required: 'Phone number is required',
            validate: (v) => {
              const digits = v.replace(/\D/g, '');
              if (digits.length !== 10) return 'Phone number must be exactly 10 digits';
              return true;
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={shared.fieldContainer}>
              <Text style={shared.label}>Phone Number</Text>
              <TextInput
                style={[shared.input, errors.phone && shared.inputError]}
                value={value}
                onChangeText={(v) => {
                  const cleaned = v.replace(/\D/g, '');
                  if (cleaned.length <= 10) onChange(cleaned);
                }}
                onBlur={onBlur}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="5551234567"
                placeholderTextColor={colors.neutral600}
                maxLength={10}
              />
              {errors.phone ? <Text style={shared.errorText}>{errors.phone.message}</Text> : null}
            </View>
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
            <View style={shared.fieldContainer}>
              <Text style={shared.label}>Driver's License Number</Text>
              <TextInput
                style={[shared.input, errors.licenseNumber && shared.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="DL-123456"
                placeholderTextColor={colors.neutral600}
              />
              {errors.licenseNumber ? <Text style={shared.errorText}>{errors.licenseNumber.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="licenseState"
          rules={{ required: 'Province/territory is required' }}
          render={({ field: { onChange, value } }) => (
            <View style={shared.fieldContainerLast}>
              <Text style={shared.label}>License Province/Territory</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={value}
                  onChange={(e: any) => onChange(e.target.value)}
                  style={webSelectStyle(!!errors.licenseState, !!value)}
                >
                  <option value="">Select province/territory...</option>
                  {CA_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <Text style={{ color: colors.neutral500 }}>Dropdown not available on this platform</Text>
              )}
              {errors.licenseState ? <Text style={shared.errorText}>{errors.licenseState.message}</Text> : null}
            </View>
          )}
        />

        <TouchableOpacity
          style={[shared.buttonPrimary, disabled && shared.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={disabled}
        >
          <Text style={[shared.buttonPrimaryText, disabled && shared.buttonDisabledText]}>
            {loading ? 'Submitting...' : 'Continue to Vehicle Registration'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[shared.buttonSecondary, { marginTop: 12, borderColor: colors.red500 }]}
          onPress={onDecline}
          disabled={declining}
        >
          <Text style={[shared.buttonSecondaryText, { color: colors.red400 }]}>
            {declining ? 'Declining...' : 'Decline Invitation'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
