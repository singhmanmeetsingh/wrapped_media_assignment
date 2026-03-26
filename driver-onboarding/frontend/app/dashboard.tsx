import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../src/store/hooks';
import { logout } from '../src/store/slices/authSlice';
import { getCampaigns, getCampaignRefs, sendInvitation, setAuthToken } from '../src/api/client';
import { CampaignStats } from '../src/types';
import { colors, shared, LOGO_URI, webInputStyle } from '../src/theme';

let RechartsComponents: any = null;
if (Platform.OS === 'web') {
  try {
    RechartsComponents = require('recharts');
  } catch {}
}

const SOURCE_COLORS: Record<string, string> = {
  facebook: '#1877f2',
  google: '#ea4335',
  referral: colors.lime,
  tiktok: '#ffffff',
  email: '#f59e0b',
};

const LINE_COLORS = [colors.lime, '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'];

function getConversionColor(rate: number): string {
  if (rate >= 0.5) return colors.lime;
  if (rate >= 0.2) return '#f59e0b';
  return '#ef4444';
}

export default function DashboardScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, isAuthenticated } = useAppSelector((state) => state.auth);

  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [campaignRefs, setCampaignRefs] = useState<{ campaign_id: string; name: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCampaign, setInviteCampaign] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteEmailTouched, setInviteEmailTouched] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      const timeout = setTimeout(() => router.replace('/login'), 0);
      return () => clearTimeout(timeout);
    }
    if (token) setAuthToken(token);
    fetchData();
    getCampaignRefs()
      .then((data) => setCampaignRefs(data.campaigns))
      .catch(() => {});
  }, [isAuthenticated]);

  const fetchData = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await getCampaigns(start || undefined, end || undefined);
      setCampaigns(data.campaigns);
    } catch (err: any) {
      if (err.status === 403 || err.status === 401) {
        dispatch(logout());
        setAuthToken(null);
        setTimeout(() => router.replace('/login'), 0);
        return;
      }
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleApplyFilter = () => fetchData(startDate, endDate);
  const handleClearFilter = () => { setStartDate(''); setEndDate(''); fetchData(); };

  const isValidEmail = (email: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  const handleInvite = async () => {
    setInviteEmailTouched(true);
    if (!inviteEmail || !inviteCampaign || inviteLoading) return;
    if (!isValidEmail(inviteEmail)) {
      setInviteError('Please enter a valid email address');
      return;
    }
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      await sendInvitation({ email: inviteEmail, campaign_id: inviteCampaign });
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteCampaign('');
      setInviteEmailTouched(false);
    } catch (err: any) {
      setInviteError(err.detail || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    setAuthToken(null);
    router.replace('/login');
  };

  const allDates = new Set<string>();
  campaigns.forEach((c) => c.signups_over_time.forEach((s) => allDates.add(s.date)));
  const sortedDates = Array.from(allDates).sort();
  const chartData = sortedDates.map((date) => {
    const point: Record<string, any> = { date };
    campaigns.forEach((c) => {
      const entry = c.signups_over_time.find((s) => s.date === date);
      point[c.name] = entry ? entry.count : 0;
    });
    return point;
  });

  const inviteDisabled = !inviteEmail || !inviteCampaign || inviteLoading || (inviteEmailTouched && !isValidEmail(inviteEmail));

  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 700;

  if (!isAuthenticated) return null;

  const sectionCard = {
    backgroundColor: colors.dark700,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.dark400,
  };

  return (
    <ScrollView style={shared.screenBg} contentContainerStyle={{ padding: 16, paddingBottom: 40, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 960 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={{ uri: LOGO_URI }} style={{ width: 40, height: 28 }} resizeMode="contain" />
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 }}>
            Dashboard
          </Text>
        </View>
        <TouchableOpacity style={shared.buttonSecondary} onPress={handleLogout}>
          <Text style={shared.buttonSecondaryText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Invite Driver */}
      <View style={sectionCard}>
        <Text style={shared.sectionLabel}>Admin Action</Text>
        <Text style={[shared.heading, { fontSize: 20, marginBottom: 16 }]}>INVITE A DRIVER</Text>

        {inviteSuccess ? (
          <View style={shared.successBox}>
            <Text style={shared.successBoxText}>{inviteSuccess}</Text>
          </View>
        ) : null}
        {inviteError ? (
          <View style={shared.errorBox}>
            <Text style={shared.errorBoxText}>{inviteError}</Text>
          </View>
        ) : null}

        {Platform.OS === 'web' && (
          <View style={{ marginBottom: 12 }}>
            {/* Email - full width row */}
            <View style={{ marginBottom: 12 }}>
              <Text style={[shared.label, { fontSize: 11 }]}>Email</Text>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e: any) => { setInviteEmail(e.target.value); setInviteEmailTouched(true); }}
                onBlur={() => setInviteEmailTouched(true)}
                placeholder="driver@example.com"
                style={{
                  ...webInputStyle,
                  width: '100%',
                  border: inviteEmailTouched && inviteEmail && !isValidEmail(inviteEmail) ? `1px solid ${colors.red500}` : `1px solid ${colors.dark400}`,
                }}
              />
              {inviteEmailTouched && inviteEmail && !isValidEmail(inviteEmail) && (
                <Text style={shared.errorText}>Please enter a valid email</Text>
              )}
            </View>
            {/* Campaign + Send button - same row */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Text style={[shared.label, { fontSize: 11 }]}>Campaign</Text>
                <select
                  value={inviteCampaign}
                  onChange={(e: any) => setInviteCampaign(e.target.value)}
                  style={{ ...webInputStyle, width: '100%', color: inviteCampaign ? colors.white : colors.neutral600 }}
                >
                  <option value="">Select campaign...</option>
                  {campaignRefs.map((c) => (
                    <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
                  ))}
                </select>
              </View>
              <TouchableOpacity
                style={[shared.buttonPrimary, inviteDisabled && shared.buttonDisabled, { paddingHorizontal: 20, paddingVertical: 10 }]}
                onPress={handleInvite}
                disabled={inviteDisabled}
              >
                <Text style={[shared.buttonPrimaryText, inviteDisabled && shared.buttonDisabledText, { fontSize: 13 }]}>
                  {inviteLoading ? 'Sending...' : 'Send Invite'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <Text style={{ color: colors.neutral500, fontSize: 12, marginTop: 4 }}>
          View sent emails at http://localhost:8069
        </Text>
      </View>

      {/* Date Filter */}
      <View style={sectionCard}>
        <Text style={[shared.label, { marginBottom: 12 }]}>Filter by Date</Text>
        {Platform.OS === 'web' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ minWidth: 150 }}>
              <Text style={[shared.label, { fontSize: 11 }]}>Start</Text>
              <input type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} style={{ ...webInputStyle, colorScheme: 'dark' }} />
            </View>
            <View style={{ minWidth: 150 }}>
              <Text style={[shared.label, { fontSize: 11 }]}>End</Text>
              <input type="date" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} style={{ ...webInputStyle, colorScheme: 'dark' }} />
            </View>
            <TouchableOpacity style={[shared.buttonPrimary, { paddingHorizontal: 20, paddingVertical: 10 }]} onPress={handleApplyFilter}>
              <Text style={[shared.buttonPrimaryText, { fontSize: 13 }]}>Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[shared.buttonSecondary, { paddingVertical: 10 }]} onPress={handleClearFilter}>
              <Text style={shared.buttonSecondaryText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator size="large" color={colors.lime} />
          <Text style={{ color: colors.neutral400, marginTop: 16 }}>Loading campaigns...</Text>
        </View>
      ) : error ? (
        <View style={[shared.errorBox, { alignItems: 'center', padding: 20 }]}>
          <Text style={[shared.errorBoxText, { marginBottom: 12 }]}>{error}</Text>
          <TouchableOpacity style={shared.buttonOutline} onPress={() => fetchData()}>
            <Text style={shared.buttonOutlineText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Campaign Table */}
          <View style={[sectionCard, { padding: 0, overflow: 'hidden' }]}>
            <Text style={[shared.heading, { fontSize: 20, padding: 20, paddingBottom: 0 }]}>CAMPAIGNS</Text>
            {(() => {
              const thStyle = { color: colors.neutral400, fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 1 };
              const tableContent = (
                <View style={isNarrow ? { minWidth: 580 } : undefined}>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: colors.dark600, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.dark400 }}>
                    <Text style={[thStyle, { flex: 2.5 }]}>Campaign</Text>
                    <Text style={[thStyle, { flex: 1.5 }]}>Source</Text>
                    <Text style={[thStyle, { flex: 1, textAlign: 'right' }]}>Total</Text>
                    <Text style={[thStyle, { flex: 1, textAlign: 'right' }]}>Done</Text>
                    <Text style={[thStyle, { flex: 1, textAlign: 'right' }]}>Decl.</Text>
                    <Text style={[thStyle, { flex: 1, textAlign: 'right' }]}>Conv.</Text>
                  </View>
                  {/* Rows */}
                  {campaigns.map((c, i) => (
                    <View key={c.id} style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', borderBottomWidth: i < campaigns.length - 1 ? 1 : 0, borderBottomColor: colors.dark600 }}>
                      <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600', flex: 2.5 }}>{c.name}</Text>
                      <View style={{ flex: 1.5 }}>
                        <View style={{ backgroundColor: SOURCE_COLORS[c.source] || '#6b7280', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' }}>
                          <Text style={{ color: c.source === 'tiktok' ? '#000' : '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{c.source}</Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' }}>{c.total_signups}</Text>
                      <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' }}>{c.completed_signups}</Text>
                      <Text style={{ color: c.declined_invitations > 0 ? colors.red400 : colors.neutral500, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' }}>{c.declined_invitations}</Text>
                      <Text style={{ color: getConversionColor(c.conversion_rate), fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' }}>
                        {(c.conversion_rate * 100).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </View>
              );
              return isNarrow ? (
                <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 16 }}>
                  {tableContent}
                </ScrollView>
              ) : (
                <View style={{ marginTop: 16 }}>{tableContent}</View>
              );
            })()}
          </View>

          {/* Chart */}
          <View style={sectionCard}>
            <Text style={[shared.heading, { fontSize: 20, marginBottom: 16 }]}>SIGN-UPS OVER TIME</Text>
            {chartData.length === 0 ? (
              <Text style={{ color: colors.neutral500, fontSize: 14, textAlign: 'center', paddingVertical: 32 }}>No sign-ups in this date range</Text>
            ) : Platform.OS === 'web' && RechartsComponents ? (
              <View style={{ width: '100%', height: 300 }}>
                <RechartsComponents.ResponsiveContainer width="100%" height={300}>
                  <RechartsComponents.LineChart data={chartData}>
                    <RechartsComponents.CartesianGrid strokeDasharray="3 3" stroke={colors.dark400} />
                    <RechartsComponents.XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                    <RechartsComponents.YAxis allowDecimals={false} stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                    <RechartsComponents.Tooltip
                      contentStyle={{ backgroundColor: colors.dark700, border: `1px solid ${colors.dark400}`, borderRadius: 8, color: colors.white }}
                      labelStyle={{ color: colors.lime, fontWeight: 'bold' }}
                    />
                    <RechartsComponents.Legend wrapperStyle={{ color: '#999' }} />
                    {campaigns.map((c, i) => (
                      <RechartsComponents.Line
                        key={c.id}
                        type="monotone"
                        dataKey={c.name}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                      />
                    ))}
                  </RechartsComponents.LineChart>
                </RechartsComponents.ResponsiveContainer>
              </View>
            ) : (
              <Text style={{ color: colors.neutral500, fontSize: 14, textAlign: 'center', paddingVertical: 32 }}>Charts available on web only</Text>
            )}
          </View>
        </>
      )}
    </View>
    </ScrollView>
  );
}
