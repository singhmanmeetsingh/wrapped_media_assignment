import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../src/store/hooks';
import { logout } from '../src/store/slices/authSlice';
import { getCampaigns, setAuthToken } from '../src/api/client';
import { CampaignStats } from '../src/types';
import LoadingSpinner from '../src/components/LoadingSpinner';
import { styles, webInputStyle } from './styles/dashboard.styles';

let RechartsComponents: any = null;
if (Platform.OS === 'web') {
  try {
    RechartsComponents = require('recharts');
  } catch {}
}

const SOURCE_COLORS: Record<string, string> = {
  facebook: '#1877f2',
  google: '#ea4335',
  referral: '#16a34a',
  tiktok: '#000000',
  email: '#f59e0b',
};

const LINE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

function getConversionColor(rate: number): string {
  if (rate >= 0.5) return '#16a34a';
  if (rate >= 0.2) return '#f59e0b';
  return '#dc2626';
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (token) setAuthToken(token);
    fetchData();
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
        router.replace('/login');
        return;
      }
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleApplyFilter = () => fetchData(startDate, endDate);
  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchData();
  };
  const handleLogout = () => {
    dispatch(logout());
    setAuthToken(null);
    router.replace('/login');
  };

  // Build chart data
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

  if (!isAuthenticated) return null;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Campaign Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Date filter */}
      <View style={styles.filterRow}>
        {Platform.OS === 'web' && (
          <>
            <View style={styles.dateField}>
              <Text style={styles.filterLabel}>Start Date</Text>
              <input
                type="date"
                value={startDate}
                onChange={(e: any) => setStartDate(e.target.value)}
                style={webInputStyle}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.filterLabel}>End Date</Text>
              <input
                type="date"
                value={endDate}
                onChange={(e: any) => setEndDate(e.target.value)}
                style={webInputStyle}
              />
            </View>
          </>
        )}
        <TouchableOpacity style={styles.filterButton} onPress={handleApplyFilter}>
          <Text style={styles.filterButtonText}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearFilter}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading campaigns..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Campaign Table */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colName]}>Campaign</Text>
              <Text style={[styles.th, styles.colSource]}>Source</Text>
              <Text style={[styles.th, styles.colNum]}>Total</Text>
              <Text style={[styles.th, styles.colNum]}>Completed</Text>
              <Text style={[styles.th, styles.colNum]}>Conversion</Text>
            </View>
            {campaigns.map((c) => (
              <View key={c.id} style={styles.tableRow}>
                <Text style={[styles.td, styles.colName]}>{c.name}</Text>
                <View style={[styles.colSource]}>
                  <View style={[styles.badge, { backgroundColor: SOURCE_COLORS[c.source] || '#6b7280' }]}>
                    <Text style={styles.badgeText}>{c.source}</Text>
                  </View>
                </View>
                <Text style={[styles.td, styles.colNum]}>{c.total_signups}</Text>
                <Text style={[styles.td, styles.colNum]}>{c.completed_signups}</Text>
                <Text style={[styles.td, styles.colNum, { color: getConversionColor(c.conversion_rate) }]}>
                  {(c.conversion_rate * 100).toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>

          {/* Chart */}
          <Text style={styles.chartTitle}>Sign-ups Over Time</Text>
          {chartData.length === 0 ? (
            <Text style={styles.emptyChart}>No sign-ups in this date range</Text>
          ) : Platform.OS === 'web' && RechartsComponents ? (
            <View style={styles.chartContainer}>
              <RechartsComponents.ResponsiveContainer width="100%" height={300}>
                <RechartsComponents.LineChart data={chartData}>
                  <RechartsComponents.CartesianGrid strokeDasharray="3 3" />
                  <RechartsComponents.XAxis dataKey="date" />
                  <RechartsComponents.YAxis allowDecimals={false} />
                  <RechartsComponents.Tooltip />
                  <RechartsComponents.Legend />
                  {campaigns.map((c, i) => (
                    <RechartsComponents.Line
                      key={c.id}
                      type="monotone"
                      dataKey={c.name}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                </RechartsComponents.LineChart>
              </RechartsComponents.ResponsiveContainer>
            </View>
          ) : (
            <Text style={styles.emptyChart}>Charts available on web only</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
