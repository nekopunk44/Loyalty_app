import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/apiUrl';

export default function AdminFinanceDashboard({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('summary');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      if (!user?.id || user?.role !== 'admin') {
        Alert.alert('Ошибка', 'Только администратор с финансовым доступом может просматривать эту страницу');
        navigation.goBack();
        return;
      }

      // Загружаем финансовую сводку
      const summaryResponse = await fetch(`${getApiUrl()}/admin/finances/summary?userId=${user.id}`);
      const summaryData = await summaryResponse.json();

      if (summaryResponse.ok) {
        setFinanceSummary(summaryData);
      } else {
        throw new Error(summaryData.error || 'Ошибка при загрузке финансов');
      }

      // Загружаем транзакции
      const transResponse = await fetch(`${getApiUrl()}/admin/finances/transactions?userId=${user.id}&limit=100`);
      const transData = await transResponse.json();

      if (transResponse.ok) {
        setTransactions(transData.transactions || []);
      }

      // Загружаем запросы на вывод
      const withdrawResponse = await fetch(`${getApiUrl()}/admin/finances/withdrawals?userId=${user.id}`);
      const withdrawData = await withdrawResponse.json();

      if (withdrawResponse.ok) {
        setWithdrawals(withdrawData.withdrawals || []);
      }
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить данные');
      console.error('Error loading admin finances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleCreateWithdrawal = async () => {
    if (!withdrawAmount || !bankAccount) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
      return;
    }

    if (parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Ошибка', 'Сумма должна быть больше 0');
      return;
    }

    if (financeSummary && parseFloat(withdrawAmount) > parseFloat(financeSummary.wallet.availableBalance)) {
      Alert.alert('Ошибка', 'Недостаточно средств на счете');
      return;
    }

    setIsWithdrawing(true);

    try {
      const response = await fetch(`${getApiUrl()}/admin/finances/withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(withdrawAmount),
          bankAccount,
          reason: withdrawReason || 'Запрос на вывод средств',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании запроса');
      }

      Alert.alert('✅ Успешно', 'Запрос на вывод создан', [
        {
          text: 'Ок',
          onPress: () => {
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setBankAccount('');
            setWithdrawReason('');
            loadData();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('❌ Ошибка', error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      booking_payment: '💰 Платеж за бронирование',
      topup_commission: '🎁 Комиссия от пополнения',
      withdrawal: '💸 Вывод средств',
      refund: '↩️ Возврат',
      adjustment: '⚙️ Корректировка',
    };
    return labels[type] || type;
  };

  const getWithdrawalStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'approved':
        return '#2196f3';
      case 'completed':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getWithdrawalStatusLabel = (status) => {
    const labels = {
      pending: 'Ожидает одобрения',
      approved: 'Одобрено',
      completed: 'Завершено',
      rejected: 'Отклонено',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isFinanceAdmin = user?.adminLevel === 1;

  if (!isFinanceAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.noAccessContainer}>
          <MaterialIcons name="lock" size={60} color={theme.colors.primary} />
          <Text style={[styles.noAccessTitle, { color: theme.colors.text }]}>
            Доступ запрещен
          </Text>
          <Text style={[styles.noAccessText, { color: theme.colors.textSecondary }]}>
            Только администратор с финансовым доступом может просматривать эту страницу
          </Text>
          <TouchableOpacity
            style={[styles.noAccessButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.noAccessButtonText}>Вернуться</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <MaterialIcons name="attach-money" size={40} color="#fff" />
        <Text style={styles.headerTitle}>Финансовая панель</Text>
        <Text style={styles.headerSubtitle}>Управление денежными средствами</Text>
      </View>

      {/* Main Balance Cards */}
      {financeSummary && (
        <>
          {/* Total Balance */}
          <View style={[styles.balanceGrid, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.balanceBox, { backgroundColor: '#2196f3', marginRight: spacing.md }]}>
              <Text style={styles.balanceBoxLabel}>Общий баланс</Text>
              <Text style={styles.balanceBoxAmount}>
                {financeSummary.wallet.totalBalance.toLocaleString('ru-RU')}₽
              </Text>
              <Text style={styles.balanceBoxSubtext}>Всего на счете</Text>
            </View>

            <View style={[styles.balanceBox, { backgroundColor: '#4caf50' }]}>
              <Text style={styles.balanceBoxLabel}>Доступно</Text>
              <Text style={styles.balanceBoxAmount}>
                {financeSummary.wallet.availableBalance.toLocaleString('ru-RU')}₽
              </Text>
              <Text style={styles.balanceBoxSubtext}>Можно вывести</Text>
            </View>
          </View>

          {/* Additional Info */}
          <View style={[styles.infoGrid, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.infoCard}>
              <MaterialIcons name="trending-up" size={24} color="#2196f3" />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Всего получено
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {financeSummary.wallet.totalReceived.toLocaleString('ru-RU')}₽
              </Text>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="trending-down" size={24} color="#f44336" />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Всего выведено
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {financeSummary.wallet.totalWithdrawn.toLocaleString('ru-RU')}₽
              </Text>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="receipt" size={24} color="#4caf50" />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Транзакций
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {financeSummary.statistics.totalPayments}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="history" size={24} color="#ff9800" />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                На рассмотрении
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {financeSummary.statistics.pendingWithdrawals}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary, marginRight: spacing.sm }]}
              onPress={() => setShowWithdrawModal(true)}
            >
              <MaterialIcons name="arrow-downward" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Вывести средства</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
              onPress={() => setSelectedTab('summary')}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Обновить</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === 'summary' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setSelectedTab('summary')}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'summary' && { color: theme.colors.primary, fontWeight: '600' },
                ]}
              >
                Сводка
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === 'transactions' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setSelectedTab('transactions')}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'transactions' && { color: theme.colors.primary, fontWeight: '600' },
                ]}
              >
                Транзакции ({transactions.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === 'withdrawals' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setSelectedTab('withdrawals')}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'withdrawals' && { color: theme.colors.primary, fontWeight: '600' },
                ]}
              >
                Выводы ({withdrawals.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {selectedTab === 'summary' && (
            <View style={styles.tabContent}>
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    Средняя транзакция
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                    {parseFloat(financeSummary.statistics.averagePayment).toLocaleString('ru-RU')}₽
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    Платежей сегодня
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                    {financeSummary.statistics.todayPayments}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    Сумма сегодня
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                    {financeSummary.statistics.todayAmount.toLocaleString('ru-RU')}₽
                  </Text>
                </View>
              </View>
            </View>
          )}

          {selectedTab === 'transactions' && (
            <View style={styles.tabContent}>
              {transactions.length > 0 ? (
                <FlatList
                  data={transactions}
                  keyExtractor={item => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={[styles.transactionItem, { backgroundColor: theme.colors.surface }]}>
                      <View style={styles.transactionContent}>
                        <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                          {getTransactionTypeLabel(item.type)}
                        </Text>
                        <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
                          {new Date(item.createdAt).toLocaleString('ru-RU')}
                        </Text>
                      </View>
                      <Text style={[styles.transactionAmount, { color: '#4caf50' }]}>
                        +{item.amount.toLocaleString('ru-RU')}₽
                      </Text>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="inbox" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Нет транзакций
                  </Text>
                </View>
              )}
            </View>
          )}

          {selectedTab === 'withdrawals' && (
            <View style={styles.tabContent}>
              {withdrawals.length > 0 ? (
                <FlatList
                  data={withdrawals}
                  keyExtractor={item => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={[styles.withdrawalItem, { backgroundColor: theme.colors.surface }]}>
                      <View style={styles.withdrawalContent}>
                        <View style={styles.withdrawalHeader}>
                          <Text style={[styles.withdrawalAmount, { color: theme.colors.text }]}>
                            {item.amount.toLocaleString('ru-RU')}₽
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: getWithdrawalStatusColor(item.status) + '20' },
                            ]}
                          >
                            <Text style={[styles.statusText, { color: getWithdrawalStatusColor(item.status) }]}>
                              {getWithdrawalStatusLabel(item.status)}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.withdrawalAccount, { color: theme.colors.textSecondary }]}>
                          {item.bankAccount}
                        </Text>
                        <Text style={[styles.withdrawalDate, { color: theme.colors.textSecondary }]}>
                          {new Date(item.createdAt).toLocaleString('ru-RU')}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="inbox" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Нет запросов на вывод
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isWithdrawing && setShowWithdrawModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Запрос на вывод средств
            </Text>

            <View style={styles.availableInfo}>
              <Text style={[styles.availableLabel, { color: theme.colors.textSecondary }]}>
                Доступно к выводу:
              </Text>
              <Text style={[styles.availableAmount, { color: theme.colors.primary }]}>
                {financeSummary?.wallet.availableBalance.toLocaleString('ru-RU')}₽
              </Text>
            </View>

            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Сумма (₽)"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              editable={!isWithdrawing}
            />

            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Номер банковского счета"
              placeholderTextColor={theme.colors.textSecondary}
              value={bankAccount}
              onChangeText={setBankAccount}
              editable={!isWithdrawing}
            />

            <TextInput
              style={[
                styles.input,
                { color: theme.colors.text, borderColor: theme.colors.border, height: 80 },
              ]}
              placeholder="Причина вывода (опционально)"
              placeholderTextColor={theme.colors.textSecondary}
              value={withdrawReason}
              onChangeText={setWithdrawReason}
              multiline
              editable={!isWithdrawing}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateWithdrawal}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Создать запрос</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#f44336' }]}
                onPress={() => setShowWithdrawModal(false)}
                disabled={isWithdrawing}
              >
                <Text style={styles.modalButtonText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.md,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  noAccessText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  noAccessButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  noAccessButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  balanceGrid: {
    flexDirection: 'row',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  balanceBox: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  balanceBoxLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  balanceBoxAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  balanceBoxSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  infoCard: {
    width: '50%',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionItem: {
    flexDirection: 'row',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionContent: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  withdrawalItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  withdrawalContent: {
    flex: 1,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  withdrawalAccount: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  withdrawalDate: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  availableInfo: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  availableLabel: {
    fontSize: 12,
  },
  availableAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  modalButtons: {
    marginTop: spacing.lg,
  },
  modalButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
