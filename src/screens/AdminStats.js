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
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
  const { stats, getDashboardStats, resetAnalytics } = useAnalytics();
  const { theme } = useTheme();

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
    { id: 'year', label: 'Год', icon: 'calendar' },
  ];

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: 'dashboard' },
    { id: 'revenue', label: 'Оборот', icon: 'trending-up' },
    { id: 'payments', label: 'Платежи', icon: 'payment' },
    { id: 'users', label: 'Пользователи', icon: 'people' },
    { id: 'properties', label: 'Объекты', icon: 'location-city' },
  ];

  const currentMetrics = getMetricsForPeriod();

  // Dropdown Menu Component
  const DropdownMenu = ({ isOpen, onToggle, items, selectedId, onSelect, theme }) => (
    <View style={{ zIndex: 100 }}>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          { 
            backgroundColor: theme.colors.cardBg,
            borderColor: theme.colors.border
          }
        ]}
        onPress={onToggle}
      >
        <Text style={[styles.dropdownButtonText, { color: theme.colors.text }]}>
          {items.find(item => item.id === selectedId)?.label}
        </Text>
        <MaterialIcons 
          name={isOpen ? 'expand-less' : 'expand-more'} 
          size={20} 
          color={theme.colors.text}
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View 
          style={[
            styles.dropdownMenu,
            { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border },
          ]}
        >
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.dropdownItem,
                selectedId === item.id && { backgroundColor: theme.colors.background },
                index !== items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
              ]}
              onPress={() => {
                onSelect(item.id);
                onToggle();
              }}
            >
              {item.icon && (
                <MaterialIcons 
                  name={item.icon} 
                  size={16} 
                  color={selectedId === item.id ? theme.colors.primary : theme.colors.text}
                  style={{ marginRight: spacing.sm }}
                />
              )}
              <Text style={[
                styles.dropdownItemText,
                { color: selectedId === item.id ? theme.colors.primary : theme.colors.text },
                selectedId === item.id && { fontWeight: '600' }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

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
        return theme.colors.primary;
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={[styles.userCard, { backgroundColor: theme.colors.cardBg }]}>
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
          <Text style={[styles.userName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.userStatus, { color: theme.colors.textSecondary }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.userStats}>
        <View style={styles.userStatItem}>
          <MaterialIcons name="shopping-cart" size={16} color={theme.colors.primary} />
          <Text style={[styles.userStatText, { color: theme.colors.text }]}>{item.purchases}</Text>
        </View>
        <View style={styles.userStatItem}>
          <MaterialIcons name="attach-money" size={16} color={theme.colors.accent} />
          <Text style={[styles.userStatText, { color: theme.colors.text }]}>PRB {item.spent}</Text>
        </View>
      </View>
    </View>
  );

  const renderPropertyItem = ({ item }) => (
    <View style={[styles.propertyCard, { backgroundColor: theme.colors.cardBg }]}>
      <View style={styles.propertyInfo}>
        <View style={[styles.propertyIcon, { backgroundColor: theme.colors.primary }]}>
          <MaterialIcons name="location-city" size={20} color="#fff" />
        </View>
        <View style={styles.propertyDetails}>
          <Text style={[styles.propertyName, { color: theme.colors.text }]}>{item.name}</Text>
          <View style={styles.propertyStats}>
            <Text style={[styles.propertyStat, { color: theme.colors.textSecondary }]}>👁 {item.views}</Text>
            <Text style={[styles.propertyStat, { color: theme.colors.textSecondary }]}>📅 {item.bookings}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.propertyRevenue, { color: theme.colors.primary }]}>PRB{(item.revenue / 1000).toFixed(0)}K</Text>
    </View>
  );

  const renderOverviewTab = () => (
    <>
      <View 
        style={[
          styles.kpiSection,
          { backgroundColor: theme.colors.cardBg }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text, backgroundColor: theme.colors.background }]}>Ключевые показатели</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: theme.colors.primary }]}>
              <MaterialIcons name="people" size={24} color="#fff" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{currentMetrics.users.toLocaleString('ru-RU')}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Пользователей</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: theme.colors.accent }]}>
              <MaterialIcons name="shopping-bag" size={24} color="#fff" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{currentMetrics.purchases.toLocaleString('ru-RU')}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Бронирований</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: theme.colors.success }]}>
              <MaterialIcons name="trending-up" size={24} color="#fff" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>PRB{(currentMetrics.revenue / 1000).toFixed(0)}K</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Оборот</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: theme.colors.secondary }]}>
              <MaterialIcons name="star" size={24} color="#fff" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{currentMetrics.premium}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Премиум</Text>
          </View>
        </View>
      </View>

      <View 
        style={[
          styles.indicatorsSection,
          { backgroundColor: theme.colors.cardBg }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text, backgroundColor: theme.colors.background }]}>Индикаторы</Text>
        <View style={styles.indicatorGrid}>
          <View style={styles.indicatorCard}>
            <Text style={[styles.indicatorLabel, { color: theme.colors.textSecondary }]}>Активные</Text>
            <Text style={[styles.indicatorValue, { color: theme.colors.text }]}>2,847</Text>
            <Text style={[styles.indicatorPercent, { color: theme.colors.success }]}>+12.5%</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={[styles.indicatorLabel, { color: theme.colors.textSecondary }]}>Завершённо</Text>
            <Text style={[styles.indicatorValue, { color: theme.colors.text }]}>8,432</Text>
            <Text style={[styles.indicatorPercent, { color: theme.colors.success }]}>+8.3%</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={[styles.indicatorLabel, { color: theme.colors.textSecondary }]}>Ожидание</Text>
            <Text style={[styles.indicatorValue, { color: theme.colors.text }]}>156</Text>
            <Text style={[styles.indicatorPercent, { color: '#ef4444' }]}>-2.1%</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={[styles.indicatorLabel, { color: theme.colors.textSecondary }]}>Отзывы</Text>
            <Text style={[styles.indicatorValue, { color: theme.colors.text }]}>4.8</Text>
            <Text style={[styles.indicatorPercent, { color: theme.colors.primary }]}>+0.3</Text>
          </View>
        </View>
      </View>

      <View style={styles.conversionSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, backgroundColor: theme.colors.background }]}>Метрики эффективности</Text>
        <View style={[styles.conversionCard, { backgroundColor: theme.colors.cardBg }]}>
          <View style={styles.conversionRow}>
            <Text style={[styles.conversionLabel, { color: theme.colors.text }]}>Коэффициент конверсии</Text>
            <Text style={[styles.conversionValue, { color: theme.colors.primary }]}>3.2%</Text>
          </View>
          <View style={[styles.conversionBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.conversionFill, { width: '32%' }]} />
          </View>
        </View>

        <View style={[styles.conversionCard, { backgroundColor: theme.colors.cardBg }]}>
          <View style={styles.conversionRow}>
            <Text style={[styles.conversionLabel, { color: theme.colors.text }]}>Среднее значение букинга</Text>
            <Text style={[styles.conversionValue, { color: theme.colors.primary }]}>PRB24,620</Text>
          </View>
          <View style={[styles.conversionBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.conversionFill, { width: '75%', backgroundColor: theme.colors.accent }]} />
          </View>
        </View>

        <View style={[styles.conversionCard, { backgroundColor: theme.colors.cardBg }]}>
          <View style={styles.conversionRow}>
            <Text style={[styles.conversionLabel, { color: theme.colors.text }]}>Повтор клиентов</Text>
            <Text style={[styles.conversionValue, { color: theme.colors.primary }]}>28.5%</Text>
          </View>
          <View style={[styles.conversionBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.conversionFill, { width: '28.5%', backgroundColor: theme.colors.secondary }]} />
          </View>
        </View>
      </View>
    </>
  );

  const renderRevenueTab = () => (
    <>
      <View style={[styles.revenueSection, { backgroundColor: theme.colors.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Распределение дохода</Text>
        
        <View style={styles.revenueChart}>
          {[65, 45, 78, 55, 88, 72, 92].map((height, index) => (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (height / 100) * 180,
                    backgroundColor: theme.colors.primary,
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
    </>
  );

  const renderPaymentsTab = () => (
    <>
      <View 
        style={[
          styles.growthSection,
          { backgroundColor: theme.colors.cardBg }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Рост показателей</Text>
        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={[styles.growthLabel, { color: theme.colors.text }]}>Месячный оборот</Text>
            <Text style={[styles.growthValue, { color: theme.colors.primary }]}>PRB2.1M</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
        </View>
        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={[styles.growthLabel, { color: theme.colors.text }]}>Средняя сумма букинга</Text>
            <Text style={[styles.growthValue, { color: theme.colors.primary }]}>+18.2%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { width: '18.2%' }]} />
          </View>
        </View>
        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={[styles.growthLabel, { color: theme.colors.text }]}>Рост месячного оборота</Text>
            <Text style={[styles.growthValue, { color: theme.colors.primary }]}>+15.7%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { width: '15.7%' }]} />
          </View>
        </View>
      </View>
      
      <View style={[styles.paymentsSection, { backgroundColor: theme.colors.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Метод платежа</Text>
        
        <View style={[styles.paymentItem, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.paymentInfo}>
            <MaterialIcons name="credit-card" size={24} color={theme.colors.primary} />
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentName, { color: theme.colors.text }]}>PayPal</Text>
              <Text style={[styles.paymentCount, { color: theme.colors.textSecondary }]}>2,340 транзакций</Text>
            </View>
          </View>
          <Text style={[styles.paymentAmount, { color: theme.colors.primary }]}>PRB834,500</Text>
        </View>

        <View style={[styles.paymentItem, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.paymentInfo}>
            <MaterialIcons name="card-giftcard" size={24} color={theme.colors.accent} />
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentName, { color: theme.colors.text }]}>Visa/MasterCard</Text>
              <Text style={[styles.paymentCount, { color: theme.colors.textSecondary }]}>5,680 транзакций</Text>
            </View>
          </View>
          <Text style={[styles.paymentAmount, { color: theme.colors.primary }]}>PRB1,245,600</Text>
        </View>

        <View style={[styles.paymentItem, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.paymentInfo}>
            <MaterialIcons name="qr-code-2" size={24} color={theme.colors.success} />
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentName, { color: theme.colors.text }]}>Криптовалюта</Text>
              <Text style={[styles.paymentCount, { color: theme.colors.textSecondary }]}>876 транзакций</Text>
            </View>
          </View>
          <Text style={[styles.paymentAmount, { color: theme.colors.primary }]}>PRB76,700</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg, color: theme.colors.text }]}>Динамика платежей</Text>
        
        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={[styles.growthLabel, { color: theme.colors.text }]}>PayPal</Text>
            <Text style={[styles.growthValue, { color: theme.colors.primary }]}>38.6%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { width: '38.6%' }]} />
          </View>
        </View>

        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={[styles.growthLabel, { color: theme.colors.text }]}>Карты</Text>
            <Text style={[styles.growthValue, { color: theme.colors.primary }]}>57.8%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { width: '57.8%' }]} />
          </View>
        </View>

        <View style={styles.growthItem}>
          <View style={styles.growthHeader}>
            <Text style={[styles.growthLabel, { color: theme.colors.text }]}>Крипто</Text>
            <Text style={[styles.growthValue, { color: theme.colors.primary }]}>3.6%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { width: '3.6%', backgroundColor: theme.colors.success }]} />
          </View>
        </View>
      </View>
    </>
  );

  const renderUsersTab = () => (
    <>
      <View style={styles.usersSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Распределение по уровням</Text>
        
        <View style={[styles.tierItem, { backgroundColor: theme.colors.cardBg }]}>
          <View style={styles.tierInfo}>
            <View style={[styles.tierBadge, { backgroundColor: '#E5E4E2' }]}>
              <Text style={styles.tierText}>Pt</Text>
            </View>
            <View>
              <Text style={[styles.tierName, { color: theme.colors.text }]}>Platinum</Text>
              <Text style={[styles.tierCount, { color: theme.colors.textSecondary }]}>1,834 пользователей</Text>
            </View>
          </View>
          <Text style={[styles.tierPercent, { color: theme.colors.primary }]}>5.6%</Text>
        </View>

        <View style={[styles.tierItem, { backgroundColor: theme.colors.cardBg }]}>
          <View style={styles.tierInfo}>
            <View style={[styles.tierBadge, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.tierText}>Au</Text>
            </View>
            <View>
              <Text style={[styles.tierName, { color: theme.colors.text }]}>Gold</Text>
              <Text style={[styles.tierCount, { color: theme.colors.textSecondary }]}>5,120 пользователей</Text>
            </View>
          </View>
          <Text style={[styles.tierPercent, { color: theme.colors.primary }]}>15.8%</Text>
        </View>

        <View style={[styles.tierItem, { backgroundColor: theme.colors.cardBg }]}>
          <View style={styles.tierInfo}>
            <View style={[styles.tierBadge, { backgroundColor: '#C0C0C0' }]}>
              <Text style={styles.tierText}>Ag</Text>
            </View>
            <View>
              <Text style={[styles.tierName, { color: theme.colors.text }]}>Silver</Text>
              <Text style={[styles.tierCount, { color: theme.colors.textSecondary }]}>8,956 пользователей</Text>
            </View>
          </View>
          <Text style={[styles.tierPercent, { color: theme.colors.primary }]}>27.6%</Text>
        </View>

        <View style={[styles.tierItem, { backgroundColor: theme.colors.cardBg }]}>
          <View style={styles.tierInfo}>
            <View style={[styles.tierBadge, { backgroundColor: '#CD7F32' }]}>
              <Text style={styles.tierText}>Br</Text>
            </View>
            <View>
              <Text style={[styles.tierName, { color: theme.colors.text }]}>Bronze</Text>
              <Text style={[styles.tierCount, { color: theme.colors.textSecondary }]}>16,546 пользователей</Text>
            </View>
          </View>
          <Text style={[styles.tierPercent, { color: theme.colors.primary }]}>51.0%</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg, color: theme.colors.text }]}>Топ активные пользователи</Text>
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
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Лучшие объекты</Text>
        
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
    <ScrollView 
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background }
      ]}
    >
      {/* Period and Tab Selectors */}
      <View style={styles.filterSection}>
        <View style={styles.filterContainer}>
          <DropdownMenu 
            isOpen={periodDropdownOpen}
            onToggle={() => setPeriodDropdownOpen(!periodDropdownOpen)}
            items={periods}
            selectedId={selectedPeriod}
            onSelect={setSelectedPeriod}
            theme={theme}
          />
        </View>
        
        <View style={styles.filterContainer}>
          <DropdownMenu 
            isOpen={tabDropdownOpen}
            onToggle={() => setTabDropdownOpen(!tabDropdownOpen)}
            items={tabs}
            selectedId={activeTab}
            onSelect={setActiveTab}
            theme={theme}
          />
        </View>
      </View>

      {/* Tab Content */}
      {getTabContent()}

      {/* Reset Analytics Button */}
      <TouchableOpacity 
        style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
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
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },

  // Filter Section with Dropdowns
  filterSection: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    zIndex: 100,
  },

  filterContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 100,
  },

  filterLabel: {
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontWeight: '600',
    display: 'none',
  },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },

  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  dropdownMenu: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'visible',
    marginTop: spacing.xs,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  dropdownItemText: {
    fontSize: 14,
  },

  // Period Section
  periodSection: {
    marginBottom: spacing.lg,
  },

  periodScrollContent: {
    paddingVertical: spacing.md,
  },

  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  periodButtonText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  periodButtonTextActive: {
    color: '#fff',
  },

  // Tab Section
  tabSection: {
    marginBottom: spacing.lg,
  },

  tabScrollContent: {
    paddingVertical: spacing.md,
  },

  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
  },

  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },

  tabButtonText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // KPI Section
  kpiSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  kpiCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },

  kpiIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  kpiLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Indicators Section
  indicatorsSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  indicatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  indicatorCard: {
    width: '48%',
    paddingVertical: spacing.md,
  },

  indicatorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  indicatorValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  indicatorPercent: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },

  // Conversion Section
  conversionSection: {
    marginBottom: spacing.lg,
  },

  conversionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  conversionLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },

  conversionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  conversionBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },

  conversionFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },

  // Revenue Section
  revenueSection: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  revenueChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 240,
    marginTop: spacing.lg,
  },

  barContainer: {
    alignItems: 'center',
    flex: 1,
  },

  bar: {
    width: '80%',
    backgroundColor: colors.primary,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },

  dayLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Growth Section
  growthSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  growthItem: {
    marginBottom: spacing.lg,
  },

  growthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  growthLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },

  growthValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },

  // Payments Section
  paymentsSection: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  paymentDetails: {
    marginLeft: spacing.md,
  },

  paymentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  paymentCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // Users Section
  usersSection: {
    marginBottom: spacing.lg,
  },

  tierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },

  tierName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  tierCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  tierPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // User Card
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
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
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },

  userDetails: {
    flex: 1,
  },

  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  userStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },

  userStatText: {
    marginLeft: spacing.xs,
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },

  // Properties Section
  propertiesSection: {
    marginBottom: spacing.lg,
  },

  propertyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },

  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  propertyIcon: {
    width: 45,
    height: 45,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  propertyDetails: {
    flex: 1,
  },

  propertyName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  propertyStats: {
    flexDirection: 'row',
  },

  propertyStat: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: spacing.lg,
  },

  propertyRevenue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },

  // Reset Button
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  resetButtonText: {
    marginLeft: spacing.md,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});