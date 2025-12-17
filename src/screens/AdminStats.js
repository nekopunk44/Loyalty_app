import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAnalytics } from '../context/AnalyticsContext';
import { useTheme } from '../context/ThemeContext';

const mockUsers = [
  { id: '1', name: 'Иван Петров', purchases: 24, spent: 12500, status: 'Platinum' },
  { id: '2', name: 'Мария Сидорова', purchases: 18, spent: 9800, status: 'Gold' },
  { id: '3', name: 'Александр Смирнов', purchases: 15, spent: 7200, status: 'Silver' },
  { id: '4', name: 'Елена Волкова', purchases: 12, spent: 5600, status: 'Silver' },
  { id: '5', name: 'Дмитрий Орлов', purchases: 8, spent: 3100, status: 'Bronze' },
];

const mockProperties = [
  { id: '1', name: 'Villa Jaconda', views: 1250, bookings: 45, revenue: 125000 },
  { id: '2', name: 'Sea House Premium', views: 980, bookings: 38, revenue: 98500 },
  { id: '3', name: 'Mountain Retreat', views: 750, bookings: 28, revenue: 72300 },
  { id: '4', name: 'Beach Villa', views: 620, bookings: 22, revenue: 56800 },
  { id: '5', name: 'Garden Estate', views: 480, bookings: 16, revenue: 41200 },
];

export default function AdminStats() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const { stats, getDashboardStats, resetAnalytics } = useAnalytics();
  const { isDark } = useTheme();

  const getMetricsForPeriod = () => {
    const metrics = {
      week: { users: 8945, purchases: 1876, revenue: 612300, premium: 421 },
      month: { users: 32456, purchases: 8765, revenue: 2156800, premium: 1834 },
      quarter: { users: 89234, purchases: 25430, revenue: 6234100, premium: 5120 },
      year: { users: 245600, purchases: 98765, revenue: 21456300, premium: 18900 },
    };
    return metrics[selectedPeriod];
  };

  const periods = [
    { id: 'week', label: 'Неделя', icon: 'date-range' },
    { id: 'month', label: 'Месяц', icon: 'today' },
    { id: 'quarter', label: 'Квартал', icon: 'event-note' },
    { id: 'year', label: 'Год', icon: 'calendar-month' },
  ];

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: 'dashboard' },
    { id: 'revenue', label: 'Оборот', icon: 'trending-up' },
    { id: 'payments', label: 'Платежи', icon: 'payment' },
    { id: 'users', label: 'Пользователи', icon: 'people' },
    { id: 'properties', label: 'Объекты', icon: 'location-city' },
  ];

  const currentMetrics = getMetricsForPeriod();

  const getTierColor = (status) => {
    switch (status) {
      case 'Platinum':
        return '#E5E4E2';
      case 'Gold':
        return '#FFD700';
      case 'Silver':
        return '#C0C0C0';
      case 'Bronze':
        return '#CD7F32';
      default:
        return colors.primary;
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View
          style={[
            styles.userAvatar,
            { backgroundColor: getTierColor(item.status) },
          ]}
        >
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userStatus}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.userStats}>
        <View style={styles.userStatItem}>
          <MaterialIcons name="shopping-cart" size={16} color={colors.primary} />
          <Text style={styles.userStatText}>{item.purchases}</Text>
        </View>
        <View style={styles.userStatItem}>
          <MaterialIcons name="attach-money" size={16} color={colors.accent} />
          <Text style={styles.userStatText}>₽ {item.spent}</Text>
        </View>
      </View>
    </View>
  );

  const renderPropertyItem = ({ item }) => (
    <View style={styles.propertyCard}>
      <View style={styles.propertyInfo}>
        <View style={[styles.propertyIcon, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="location-city" size={20} color="#fff" />
        </View>
        <View style={styles.propertyDetails}>
          <Text style={styles.propertyName}>{item.name}</Text>
          <View style={styles.propertyStats}>
            <Text style={styles.propertyStat}>👁 {item.views}</Text>
            <Text style={styles.propertyStat}>📅 {item.bookings}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.propertyRevenue}>₽{(item.revenue / 1000).toFixed(0)}K</Text>
    </View>
  );

  const renderOverviewTab = () => (
    <>
      <View style={styles.kpiSection}>
        <Text style={styles.sectionTitle}>Ключевые показатели</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="people" size={24} color="#fff" />
            </View>
            <Text style={styles.kpiValue}>{currentMetrics.users.toLocaleString('ru-RU')}</Text>
            <Text style={styles.kpiLabel}>Пользователей</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="shopping-bag" size={24} color="#fff" />
            </View>
            <Text style={styles.kpiValue}>{currentMetrics.purchases.toLocaleString('ru-RU')}</Text>
            <Text style={styles.kpiLabel}>Бронирований</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.success }]}>
              <MaterialIcons name="trending-up" size={24} color="#fff" />
            </View>
            <Text style={styles.kpiValue}>₽{(currentMetrics.revenue / 1000).toFixed(0)}K</Text>
            <Text style={styles.kpiLabel}>Оборот</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="star" size={24} color="#fff" />
            </View>
            <Text style={styles.kpiValue}>{currentMetrics.premium}</Text>
            <Text style={styles.kpiLabel}>Премиум</Text>
          </View>
        </View>
      </View>

      <View style={styles.indicatorsSection}>
        <Text style={styles.sectionTitle}>Индикаторы</Text>
        <View style={styles.indicatorGrid}>
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorLabel}>Активные</Text>
            <Text style={styles.indicatorValue}>2,847</Text>
            <Text style={styles.indicatorPercent}>+12.5%</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorLabel}>Завершённо</Text>
            <Text style={styles.indicatorValue}>8,432</Text>
            <Text style={styles.indicatorPercent}>+8.3%</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorLabel}>Ожидание</Text>
            <Text style={styles.indicatorValue}>156</Text>
            <Text style={styles.indicatorPercent}>-2.1%</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorLabel}>Отзывы</Text>
            <Text style={styles.indicatorValue}>4.8</Text>
            <Text style={styles.indicatorPercent}>+0.3</Text>
          </View>
        </View>
      </View>

      <View style={styles.conversionSection}>
        <Text style={styles.sectionTitle}>Метрики эффективности</Text>
        <View style={styles.conversionCard}>
          <View style={styles.conversionRow}>
            <Text style={styles.conversionLabel}>Коэффициент конверсии</Text>
            <Text style={styles.conversionValue}>3.2%</Text>
          </View>
          <View style={styles.conversionBar}>
            <View style={[styles.conversionFill, { width: '32%' }]} />
          </View>
        </View>

        <View style={styles.conversionCard}>
          <View style={styles.conversionRow}>
            <Text style={styles.conversionLabel}>Среднее значение букинга</Text>
            <Text style={styles.conversionValue}>₽24,620</Text>
          </View>
          <View style={styles.conversionBar}>
            <View style={[styles.conversionFill, { width: '75%', backgroundColor: colors.accent }]} />
          </View>
        </View>

        <View style={styles.conversionCard}>
          <View style={styles.conversionRow}>
            <Text style={styles.conversionLabel}>Повтор клиентов</Text>
            <Text style={styles.conversionValue}>28.5%</Text>
          </View>
          <View style={styles.conversionBar}>
            <View style={[styles.conversionFill, { width: '28.5%', backgroundColor: colors.secondary }]} />
          </View>
        </View>
      </View>
    </>
  );

  const renderRevenueTab = () => (
    <>
      <View style={styles.revenueSection}>
        <Text style={styles.sectionTitle}>Распределение дохода</Text>
        
        <View style={styles.revenueChart}>
          {[65, 45, 78, 55, 88, 72, 92].map((height, index) => (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (height / 100) * 180,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
              <Text style={styles.dayLabel}>
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.growthSection}>
        <Text style={styles.sectionTitle}>Рост показателей</Text>
        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={styles.growthLabel}>Месячный оборот</Text>
            <Text style={styles.growthValue}>₽2.1M</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
        </View>
        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={styles.growthLabel}>Средняя сумма букинга</Text>
            <Text style={styles.growthValue}>+18.2%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '18.2%' }]} />
          </View>
        </View>
        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={styles.growthLabel}>Рост месячного оборота</Text>
            <Text style={styles.growthValue}>+15.7%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '15.7%' }]} />
          </View>
        </View>
      </View>
    </>
  );

  const renderPaymentsTab = () => (
    <>
      <View style={styles.paymentsSection}>
        <Text style={styles.sectionTitle}>Метод платежа</Text>
        
        <View style={styles.paymentItem}>
          <View style={styles.paymentInfo}>
            <MaterialIcons name="credit-card" size={24} color={colors.primary} />
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentName}>PayPal</Text>
              <Text style={styles.paymentCount}>2,340 транзакций</Text>
            </View>
          </View>
          <Text style={styles.paymentAmount}>₽834,500</Text>
        </View>

        <View style={styles.paymentItem}>
          <View style={styles.paymentInfo}>
            <MaterialIcons name="card-giftcard" size={24} color={colors.accent} />
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentName}>Visa/MasterCard</Text>
              <Text style={styles.paymentCount}>5,680 транзакций</Text>
            </View>
          </View>
          <Text style={styles.paymentAmount}>₽1,245,600</Text>
        </View>

        <View style={styles.paymentItem}>
          <View style={styles.paymentInfo}>
            <MaterialIcons name="qr-code-2" size={24} color={colors.success} />
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentName}>Криптовалюта</Text>
              <Text style={styles.paymentCount}>876 транзакций</Text>
            </View>
          </View>
          <Text style={styles.paymentAmount}>₽76,700</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Динамика платежей</Text>
        
        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={styles.growthLabel}>PayPal</Text>
            <Text style={styles.growthValue}>38.6%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '38.6%' }]} />
          </View>
        </View>

        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={styles.growthLabel}>Карты</Text>
            <Text style={styles.growthValue}>57.8%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '57.8%' }]} />
          </View>
        </View>

        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={styles.growthLabel}>Крипто</Text>
            <Text style={styles.growthValue}>3.6%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '3.6%', backgroundColor: colors.success }]} />
          </View>
        </View>
      </View>
    </>
  );

  const renderUsersTab = () => (
    <>
      <View style={styles.usersSection}>
        <Text style={styles.sectionTitle}>Распределение по уровням</Text>
        
        <View style={styles.tierItem}>
          <View style={styles.tierInfo}>
            <View style={[styles.tierBadge, { backgroundColor: '#E5E4E2' }]}>
              <Text style={styles.tierText}>Pt</Text>
            </View>
            <View>
              <Text style={styles.tierName}>Platinum</Text>
              <Text style={styles.tierCount}>1,834 пользователей</Text>
            </View>
          </View>
          <Text style={styles.tierPercent}>5.6%</Text>
        </View>

        <View style={styles.tierItem}>
          <View style={styles.tierInfo}>
            <View style={[styles.tierBadge, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.tierText}>Au</Text>
            </View>
            <View>
              <Text style={styles.tierName}>Gold</Text>
              <Text style={styles.tierCount}>5,120 пользователей</Text>
            </View>
          </View>
          <Text style={styles.tierPercent}>15.8%</Text>
        </View>

        <View style={styles.tierItem}>
          <View style={styles.tierInfo}>
            <View style={[styles.tierBadge, { backgroundColor: '#C0C0C0' }]}>
              <Text style={styles.tierText}>Ag</Text>
            </View>
            <View>
              <Text style={styles.tierName}>Silver</Text>
              <Text style={styles.tierCount}>8,956 пользователей</Text>
            </View>
          </View>
          <Text style={styles.tierPercent}>27.6%</Text>
        </View>

        <View style={styles.tierItem}>
          <View style={styles.tierInfo}>
            <View style={[styles.tierBadge, { backgroundColor: '#CD7F32' }]}>
              <Text style={styles.tierText}>Br</Text>
            </View>
            <View>
              <Text style={styles.tierName}>Bronze</Text>
              <Text style={styles.tierCount}>16,546 пользователей</Text>
            </View>
          </View>
          <Text style={styles.tierPercent}>51.0%</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Топ активные пользователи</Text>
        <FlatList
          data={mockUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      </View>
    </>
  );

  const renderPropertiesTab = () => (
    <>
      <View style={styles.propertiesSection}>
        <Text style={styles.sectionTitle}>Лучшие объекты</Text>
        
        <FlatList
          data={mockProperties}
          keyExtractor={(item) => item.id}
          renderItem={renderPropertyItem}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      </View>
    </>
  );

  const handleResetAnalytics = () => {
    Alert.alert(
      'Сброс аналитики',
      'Вы уверены? Это действие нельзя отменить.',
      [
        { text: 'Отмена', onPress: () => {}, style: 'cancel' },
        {
          text: 'Сброс',
          onPress: () => {
            resetAnalytics();
            alert('Аналитика успешно сброшена');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'revenue':
        return renderRevenueTab();
      case 'payments':
        return renderPaymentsTab();
      case 'users':
        return renderUsersTab();
      case 'properties':
        return renderPropertiesTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSection}>
        <Text style={styles.sectionTitle}>Выберите период</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodScrollContent}
        >
          {periods.map((period) => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodButton,
                selectedPeriod === period.id && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <MaterialIcons 
                name={period.icon} 
                size={16} 
                color={selectedPeriod === period.id ? '#fff' : colors.textSecondary}
              />
              <Text 
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.id && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                activeTab === tab.id && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <MaterialIcons 
                name={tab.icon} 
                size={18} 
                color={activeTab === tab.id ? colors.primary : colors.textSecondary}
              />
              <Text 
                style={[
                  styles.tabButtonText,
                  activeTab === tab.id && styles.tabButtonTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      {getTabContent()}

      {/* Reset Analytics Button */}
      <TouchableOpacity 
        style={styles.resetButton}
        onPress={handleResetAnalytics}
      >
        <MaterialIcons name="refresh" size={20} color="#fff" />
        <Text style={styles.resetButtonText}>Сбросить аналитику</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  periodSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  periodScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginRight: spacing.sm,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  tabSection: {
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabScrollContent: {
    paddingHorizontal: spacing.md,
    gap: 0,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  // KPI Section
  kpiSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  kpiIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  // Indicators Section
  indicatorsSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  indicatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  indicatorCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  indicatorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  indicatorValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  indicatorPercent: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  // Conversion Section
  conversionSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  conversionCard: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  conversionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  conversionValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  conversionBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  conversionFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  // Revenue Section
  revenueSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  revenueChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: colors.cardBg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    height: 220,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 30,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  dayLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Growth Section
  growthSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  growthItem: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  growthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  growthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  growthValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  // Payments Section
  paymentsSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  paymentItem: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  paymentName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  paymentCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  // Users Section
  usersSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  tierItem: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tierBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  tierName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  tierCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tierPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  userCard: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  userStatus: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  // Properties Section
  propertiesSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  propertyCard: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertyIcon: {
    width: 45,
    height: 45,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  propertyDetails: {
    flex: 1,
  },
  propertyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  propertyStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  propertyStat: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  propertyRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  // Reset Button
  resetButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
