import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from '../context/ThemeContext';
import { useAnalytics } from '../context/AnalyticsContext';
import { useBookings } from '../context/BookingContext';
import { useEvents } from '../context/EventContext';

export default function AdminDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const { analyticsData } = useAnalytics();
  const { bookings } = useBookings();
  const { events } = useEvents();
  const { theme } = useTheme();
  
  // Анимация цветов при смене темы
  const [bgColorAnim] = useState(new Animated.Value(0));
  const [cardColorAnim] = useState(new Animated.Value(0));
  
  const [activityStats, setActivityStats] = useState({
    newRegistrations: 0,
    recentBookings: 0,
    activeEvents: 0,
  });

  useEffect(() => {
    // Плавная анимация цветов при смене темы
    Animated.parallel([
      Animated.timing(bgColorAnim, {
        toValue: theme.isDark ? 1 : 0,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(cardColorAnim, {
        toValue: theme.isDark ? 1 : 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  }, [theme.isDark]);

  useEffect(() => {
    calculateActivityStats();
  }, [analyticsData, bookings, events]);

  const calculateActivityStats = () => {
    // Новые регистрации за 12 часов
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const newRegs = analyticsData.recentActivity?.filter(
      a => a.type === 'registration' && new Date(a.timestamp) > twelveHoursAgo
    )?.length || 0;

    // Бронирования за 12 часов
    const recentBookingsCount = bookings?.filter(b => {
      const bookingDate = new Date(b.createdAt || b.date);
      return bookingDate > twelveHoursAgo;
    })?.length || 0;

    // Активные события
    const activeEventsCount = events?.filter(e => {
      const status = e.status?.toLowerCase() || '';
      return status === 'active' || status === 'активный';
    })?.length || 0;

    setActivityStats({
      newRegistrations: newRegs,
      recentBookings: recentBookingsCount,
      activeEvents: activeEventsCount,
    });
  };

  const handleLogout = () => {
    logout();
  };

  const handleMenuPress = (screen) => {
    if (screen === 'Events') {
      navigation.navigate('AdminEvents');
    } else if (screen === 'Users') {
      navigation.navigate('AdminUsers');
    } else if (screen === 'Stats') {
      navigation.navigate('AdminStats');
    } else if (screen === 'Settings') {
      navigation.navigate('AdminSettings');
    }
  };

  const CompactStatCard = ({ icon, label, value, color, fullWidth, currency }) => (
    <View 
      style={[
        styles.compactStatCard, 
        fullWidth && { width: '100%' }, 
        !fullWidth && { width: '48%' }, 
        { 
          borderLeftColor: color,
          backgroundColor: theme.colors.cardBg,
        }
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={28} color="#fff" />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        <View style={styles.statValueContainer}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
          {currency && <Text style={[styles.statValue, { color: theme.colors.text }]}>{` ${currency}`}</Text>}
        </View>
      </View>
    </View>
  );

  return (
    <Animated.ScrollView 
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: bgColorAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [lightTheme.colors.background, darkTheme.colors.background],
          }),
          paddingHorizontal: spacing.md,
        }
      ]}
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Quick Stats - Компактный вид */}
      <View style={styles.statsGrid}>
        <CompactStatCard
          icon="people"
          label="Активные"
          value={analyticsData.totalUsers?.toString() || '0'}
          color={theme.colors.primary}
        />
        <CompactStatCard
          icon="bookmark"
          label="Бронирования"
          value={analyticsData.totalBookings?.toString() || '0'}
          color={theme.colors.accent}
        />
      </View>
      <View style={styles.statsGridFull}>
        <CompactStatCard
          icon="trending-up"
          label="Оборот за месяц"
          value={(analyticsData.totalRevenue || 0).toLocaleString()}
          color={theme.colors.success}
          fullWidth
          currency="PRB"
        />
      </View>

      {/* Management Options - Grid Layout */}
      <View 
        style={[
          styles.section,
          {
            backgroundColor: theme.colors.cardBg,
          }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Быстрые действия</Text>
        
        <View style={styles.menuGrid}>
          <View style={styles.menuGridRow}>
            <TouchableOpacity 
              style={[styles.menuGridItem, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleMenuPress('Events')}
            >
              <View style={styles.menuGridIcon}>
                <MaterialIcons name="celebration" size={24} color="#fff" />
              </View>
              <Text style={styles.menuGridTitle}>События и аукционы</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuGridItem, { backgroundColor: theme.colors.secondary }]}
              onPress={() => handleMenuPress('Users')}
            >
              <View style={styles.menuGridIcon}>
                <MaterialIcons name="supervised-user-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.menuGridTitle}>Управление пользователями</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.menuGridRow}>
            <TouchableOpacity 
              style={[styles.menuGridItem, { backgroundColor: theme.colors.accent }]}
              onPress={() => handleMenuPress('Stats')}
            >
              <View style={styles.menuGridIcon}>
                <MaterialIcons name="analytics" size={24} color="#fff" />
              </View>
              <Text style={styles.menuGridTitle}>Статистика и отчеты</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuGridItem, { backgroundColor: theme.colors.success }]}
              onPress={() => handleMenuPress('Settings')}
            >
              <View style={styles.menuGridIcon}>
                <MaterialIcons name="tune" size={24} color="#fff" />
              </View>
              <Text style={styles.menuGridTitle}>Параметры</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View 
        style={[
          styles.section,
          {
            backgroundColor: theme.colors.cardBg,
          }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Последняя активность</Text>
        <View style={[styles.activityItem, { borderBottomColor: theme.colors.border }]}>
          <View style={[styles.activityDot, { backgroundColor: theme.colors.primary }]} />
          <View style={styles.activityContent}>
            <Text style={[styles.activityTitle, { color: theme.colors.text }]}>{activityStats.newRegistrations} новых регистраций</Text>
            <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>за последние 12 часов</Text>
          </View>
        </View>
        <View style={[styles.activityItem, { borderBottomColor: theme.colors.border }]}>
          <View style={[styles.activityDot, { backgroundColor: theme.colors.accent }]} />
          <View style={styles.activityContent}>
            <Text style={[styles.activityTitle, { color: theme.colors.text }]}>{activityStats.recentBookings} бронирований</Text>
            <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>за последние 12 часов</Text>
          </View>
        </View>
        <View style={styles.activityItem}>
          <View style={[styles.activityDot, { backgroundColor: theme.colors.success }]} />
          <View style={styles.activityContent}>
            <Text style={[styles.activityTitle, { color: theme.colors.text }]}>{activityStats.activeEvents} активных событий</Text>
            <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>проводятся сейчас</Text>
          </View>
        </View>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondary,
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  role: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  // Компактная сетка статистики
  statsGrid: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statsGridFull: {
    marginBottom: spacing.lg,
  },
  compactStatCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 70,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  statTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValueContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  // Grid layout для быстрых действий
  menuGrid: {
    gap: spacing.md,
  },
  menuGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  menuGridItem: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  menuGridIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  menuGridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  menuGridDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 11,
    marginTop: 2,
  },
});
