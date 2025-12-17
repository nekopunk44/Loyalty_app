import React from 'react';
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

export default function AdminDashboard({ navigation }) {
  const { user, logout } = useAuth();

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

  const CompactStatCard = ({ icon, label, value, color }) => (
    <View style={[styles.compactStatCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={20} color="#fff" />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Добро пожаловать, {user?.name}! 👋</Text>
          <Text style={styles.role}>Администратор</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats - Компактный вид */}
      <View style={styles.statsGrid}>
        <CompactStatCard
          icon="people"
          label="Активные"
          value="1,243"
          color={colors.primary}
        />
        <CompactStatCard
          icon="shopping-cart"
          label="Покупок"
          value="156"
          color={colors.accent}
        />
        <CompactStatCard
          icon="trending-up"
          label="Оборот"
          value="₽45K"
          color={colors.success}
        />
        <CompactStatCard
          icon="star"
          label="VIP"
          value="89"
          color={colors.secondary}
        />
      </View>

      {/* Management Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Быстрые действия</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => handleMenuPress('Events')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="event-note" size={24} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>События и аукционы</Text>
            <Text style={styles.menuDesc}>Управление событиями</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => handleMenuPress('Users')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.secondary }]}>
            <MaterialIcons name="people-outline" size={24} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Управление пользователями</Text>
            <Text style={styles.menuDesc}>Онлайн пользователи и профили</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => handleMenuPress('Stats')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
            <MaterialIcons name="bar-chart" size={24} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Статистика и отчёты</Text>
            <Text style={styles.menuDesc}>Аналитика и графики</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => handleMenuPress('Settings')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.success }]}>
            <MaterialIcons name="settings" size={24} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Параметры программы</Text>
            <Text style={styles.menuDesc}>Кешбек, уровни, условия</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Последняя активность</Text>
        <View style={styles.activityItem}>
          <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>5 новых регистраций</Text>
            <Text style={styles.activityTime}>5 минут назад</Text>
          </View>
        </View>
        <View style={styles.activityItem}>
          <View style={[styles.activityDot, { backgroundColor: colors.accent }]} />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>156 покупок</Text>
            <Text style={styles.activityTime}>сегодня, 14:30</Text>
          </View>
        </View>
        <View style={styles.activityItem}>
          <View style={[styles.activityDot, { backgroundColor: colors.success }]} />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Аукцион окончен</Text>
            <Text style={styles.activityTime}>вчера, 18:00</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  compactStatCard: {
    width: '48%',
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.md,
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
    backgroundColor: colors.cardBg,
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
    paddingVertical: spacing.sm,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text,
  },
  activityTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
