import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useUser } from '../contexts/UserContext';

const { width: screenWidth } = Dimensions.get('window');

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const riskColors = {
  Normal: '#2ecc71',
  'Low Risk': '#3498db',
  Monitor: '#f1c40f',
  'Mild Jaundice': '#e67e22',
  'Moderate Jaundice': '#e74c3c',
  'Severe Jaundice': '#8e44ad',
  'Serum Test Needed': '#e74c3c',
  'Urgent Referral': '#8e44ad',
};

const formatShortDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function DashboardScreen({ navigation }) {
  const { screeningHistory } = useUser();
  
  console.log('=== DASHBOARD SCREEN ===');
  console.log('Screening History Length:', screeningHistory.length);
  console.log('Screening History:', JSON.stringify(screeningHistory, null, 2));

  const dashboardData = useMemo(() => {
    if (screeningHistory.length === 0) {
      return {
        totalScreenings: 0,
        jaundiceCases: 0,
        positiveRate: 0,
        avgProbability: 0,
        avgYellowTint: 0,
        riskDistribution: { Normal: 0, 'Low Risk': 0, Monitor: 0, 'Mild Jaundice': 0, 'Moderate Jaundice': 0, 'Severe Jaundice': 0, 'Serum Test Needed': 0, 'Urgent Referral': 0 },
        recentTrend: { labels: [], datasets: [{ data: [] }] },
        yellowTrend: { labels: [], datasets: [{ data: [] }] },
        weeklyStats: { labels: ['Prev 7 Days', 'Last 7 Days'], datasets: [{ data: [0, 0] }] },
      };
    }

    const validScreenings = screeningHistory.filter(entry => 
      entry && 
      entry.timestamp && 
      !Number.isNaN(new Date(entry.timestamp).getTime()) &&
      isFiniteNumber(entry.jaundice_probability) &&
      isFiniteNumber(entry.yellow_tint_percentage)
    );

    if (validScreenings.length === 0) {
      return {
        totalScreenings: screeningHistory.length,
        jaundiceCases: 0,
        positiveRate: 0,
        avgProbability: 0,
        avgYellowTint: 0,
        riskDistribution: { Normal: 0, 'Low Risk': 0, Monitor: 0, 'Mild Jaundice': 0, 'Moderate Jaundice': 0, 'Severe Jaundice': 0, 'Serum Test Needed': 0, 'Urgent Referral': 0 },
        recentTrend: { labels: [], datasets: [{ data: [] }] },
        yellowTrend: { labels: [], datasets: [{ data: [] }] },
        weeklyStats: { labels: ['Prev 7 Days', 'Last 7 Days'], datasets: [{ data: [0, 0] }] },
      };
    }

    const totalScreenings = validScreenings.length;
    const jaundiceCases = validScreenings.filter((r) => r.prediction_label === 'Jaundice').length;
    const positiveRate = totalScreenings > 0 ? (jaundiceCases / totalScreenings) * 100 : 0;
    const avgProbability =
      validScreenings.reduce((acc, r) => acc + Number(r.jaundice_probability || 0), 0) / totalScreenings;
    const avgYellowTint =
      validScreenings.reduce((acc, r) => acc + Number(r.yellow_tint_percentage || 0), 0) / totalScreenings;

    const riskDistribution = validScreenings.reduce(
      (acc, r) => {
        acc[r.risk] = (acc[r.risk] || 0) + 1;
        return acc;
      },
      { Normal: 0, 'Low Risk': 0, Monitor: 0, 'Mild Jaundice': 0, 'Moderate Jaundice': 0, 'Severe Jaundice': 0, 'Serum Test Needed': 0, 'Urgent Referral': 0 }
    );

    const recent = validScreenings.slice(0, 7).reverse();
    const recentTrend = {
      labels: recent.map((r) => formatShortDate(r.timestamp)),
      datasets: [
        {
          data: recent.map((r) => Number(r.jaundice_probability || 0) * 100),
          color: (opacity = 1) => `rgba(32, 201, 151, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    const yellowTrend = {
      labels: recent.map((r) => formatShortDate(r.timestamp)),
      datasets: [
        {
          data: recent.map((r) => Number(r.yellow_tint_percentage || 0)),
          color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const lastWeek = validScreenings.filter((r) => new Date(r.timestamp) >= oneWeekAgo && new Date(r.timestamp) < now);
    const prevWeek = validScreenings.filter(
      (r) => new Date(r.timestamp) >= twoWeeksAgo && new Date(r.timestamp) < oneWeekAgo
    );

    const lastWeekAvg =
      lastWeek.length > 0
        ? (lastWeek.reduce((acc, r) => acc + Number(r.jaundice_probability || 0), 0) / lastWeek.length) * 100
        : 0;
    const prevWeekAvg =
      prevWeek.length > 0
        ? (prevWeek.reduce((acc, r) => acc + Number(r.jaundice_probability || 0), 0) / prevWeek.length) * 100
        : 0;

    return {
      totalScreenings,
      jaundiceCases,
      positiveRate,
      avgProbability: avgProbability * 100,
      avgYellowTint: avgYellowTint,
      riskDistribution,
      recentTrend,
      yellowTrend,
      weeklyStats: {
        labels: ['Prev 7 Days', 'Last 7 Days'],
        datasets: [{ data: [prevWeekAvg, lastWeekAvg] }],
      },
    };
  }, [screeningHistory]);

  const pieData = Object.entries(dashboardData.riskDistribution)
    .filter(([_, count]) => count > 0)
    .map(([risk, count]) => ({
      name: risk,
      population: count,
      color: riskColors[risk],
      legendFontColor: '#ffffff',
      legendFontSize: 12,
    }));

  if (screeningHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="dashboard" size={64} color="#a9c7e3" />
        <Text style={styles.emptyText}>No data yet</Text>
        <Text style={styles.emptySubtext}>Start screening to see your dashboard</Text>
        <TouchableOpacity style={styles.startButton} onPress={() => navigation.navigate('Camera')}>
          <Text style={styles.startButtonText}>Start Screening</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Real yellow tint analysis from actual screenings</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard icon="history" value={dashboardData.totalScreenings} label="Total Screenings" color="#20c997" />
        <StatCard icon="warning" value={dashboardData.jaundiceCases} label="Jaundice Cases" color="#e67e22" />
        <StatCard
          icon="analytics"
          value={`${dashboardData.avgProbability.toFixed(1)}%`}
          label="Avg Jaundice Probability"
          color="#3498db"
        />
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon="percent"
          value={`${dashboardData.positiveRate.toFixed(1)}%`}
          label="Positive Rate"
          color="#9b59b6"
        />
        <StatCard
          icon="colorize"
          value={`${dashboardData.avgYellowTint.toFixed(2)}%`}
          label="Avg Yellow Tint"
          color="#f1c40f"
        />
      </View>

      {pieData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Risk Distribution</Text>
          <PieChart
            data={pieData}
            width={screenWidth - 48}
            height={220}
            chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            style={styles.chart}
          />
        </View>
      )}

      {dashboardData.recentTrend.datasets[0].data.length > 1 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Recent Jaundice Probability Trend (%)</Text>
          <LineChart
            data={dashboardData.recentTrend}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              backgroundColor: '#162d44',
              backgroundGradientFrom: '#162d44',
              backgroundGradientTo: '#1f3f5f',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(32, 201, 151, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 12 },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {dashboardData.yellowTrend.datasets[0].data.length > 1 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Yellow Tint Percentage Trend (%)</Text>
          <LineChart
            data={dashboardData.yellowTrend}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              backgroundColor: '#162d44',
              backgroundGradientFrom: '#162d44',
              backgroundGradientTo: '#1f3f5f',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 12 },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weekly Probability Comparison (%)</Text>
        <BarChart
          data={dashboardData.weeklyStats}
          width={screenWidth - 48}
          height={200}
          chartConfig={{
            backgroundColor: '#162d44',
            backgroundGradientFrom: '#162d44',
            backgroundGradientTo: '#1f3f5f',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 12 },
          }}
          style={styles.chart}
        />
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <View style={styles.statCard}>
      <MaterialIcons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1d2c' },
  contentContainer: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#a9c7e3', fontSize: 15, textAlign: 'center' },
  statsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#162d44',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginVertical: 8 },
  statLabel: { color: '#a9c7e3', fontSize: 12, textAlign: 'center' },
  chartContainer: { backgroundColor: '#162d44', borderRadius: 16, padding: 16, marginBottom: 18 },
  chartTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  chart: { borderRadius: 12 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1d2c',
    padding: 24,
  },
  emptyText: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtext: { color: '#a9c7e3', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  startButton: { backgroundColor: '#20c997', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  startButtonText: { color: '#0b1d2c', fontSize: 16, fontWeight: '700' },
});

