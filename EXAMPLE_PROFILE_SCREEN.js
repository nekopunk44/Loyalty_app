/**
 * ПРИМЕР: Обновленный ProfileScreen с использованием UserDataContext
 * 
 * Замените импорты и начальное состояние в вашем ProfileScreen.js
 */

// ДОБАВЬТЕ ЭТА ИМПОРТЫ В НАЧАЛО ФАЙЛА:
// import { useUserData } from '../context/UserDataContext';

/**
 * ШАГ 1: Добавьте hook в функцию компонента
 */

export default function ProfileScreen() {
  // ... существующие hooks
  const { userBalance, walletBalance, userStats, refreshUserData, loading } = useUserData();
  
  // ... существующий код

  /**
   * ШАГ 2: Загружайте данные при открытии экрана
   */
  useFocusEffect(
    React.useCallback(() => {
      refreshUserData();
    }, [refreshUserData])
  );

  /**
   * ШАГ 3: Отображайте финансовые данные
   */
  
  // Замените отображение баланса на:
  return (
    <ScrollView style={styles.container}>
      {/* БАЛАНС И КОШЕЛЁК */}
      <View style={styles.balanceSection}>
        <View style={styles.balanceCard}>
          <MaterialIcons name="account-balance-wallet" size={28} color={colors.primary} />
          <Text style={styles.balanceLabel}>Баланс счёта</Text>
          <Text style={styles.balanceAmount}>${userBalance.toFixed(2)}</Text>
        </View>
        
        <View style={styles.balanceCard}>
          <MaterialIcons name="payment" size={28} color={colors.accent} />
          <Text style={styles.balanceLabel}>Кошелёк</Text>
          <Text style={styles.balanceAmount}>${walletBalance.toFixed(2)}</Text>
        </View>
      </View>

      {/* СТАТИСТИКА */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Статистика</Text>
        
        <View style={styles.statsGrid}>
          <StatCard
            icon="check-circle"
            label="Завершённые\nбронирования"
            value={userStats?.completedBookings || 0}
            color={colors.success}
          />
          <StatCard
            icon="close-circle"
            label="Отменённые\nбронирования"
            value={userStats?.cancelledBookings || 0}
            color={colors.danger}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="shopping-bag"
            label="Всего\nбронирований"
            value={userStats?.totalBookings || 0}
            color={colors.primary}
          />
          <StatCard
            icon="trending-up"
            label="Всего\nпотрачено"
            value={`$${(userStats?.totalSpent || 0).toFixed(0)}`}
            color={colors.warning}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="star"
            label="Средний\nрейтинг"
            value={(userStats?.averageRating || 0).toFixed(1)}
            color={colors.accent}
          />
          <StatCard
            icon="message"
            label="Отзывов\nоставлено"
            value={userStats?.reviewsCount || 0}
            color={colors.info}
          />
        </View>
      </View>

      {/* ЗАРАБОТКИ ОТ РЕФЕРАЛОВ */}
      <View style={styles.referralSection}>
        <MaterialIcons name="trending-up" size={24} color={colors.primary} />
        <Text style={styles.referralLabel}>Заработано от рефералов</Text>
        <Text style={styles.referralAmount}>${(userStats?.totalEarned || 0).toFixed(2)}</Text>
      </View>

      {/* КНОПКА ОБНОВЛЕНИЯ */}
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={refreshUserData}
        disabled={loading}
      >
        <MaterialIcons name="refresh" size={20} color="#fff" />
        <Text style={styles.refreshButtonText}>
          {loading ? 'Обновление...' : 'Обновить данные'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/**
 * Вспомогательный компонент для отображения статистики
 */
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialIcons name={icon} size={24} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/**
 * ШАГ 4: Добавьте стили в конец файла
 */

const styles = StyleSheet.create({
  // ... существующие стили ...

  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },

  balanceCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  balanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.xs,
  },

  statsSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },

  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 14,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },

  referralSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },

  referralLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    flex: 1,
  },

  referralAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },

  refreshButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },

  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

/**
 * ШАГ 5: Интеграция с другими операциями
 * 
 * При создании бронирования:
 * import { useUserData } from '../context/UserDataContext';
 * 
 * const { incrementBookings, addSpentAmount } = useUserData();
 * 
 * const handleCreateBooking = async (bookingData) => {
 *   // ... создание бронирования на сервере
 *   await incrementBookings();
 *   await addSpentAmount(bookingData.totalPrice);
 * };
 */
