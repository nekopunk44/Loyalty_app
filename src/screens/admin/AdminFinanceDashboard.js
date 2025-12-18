import React, { useEffect, useMemo, useState } from 'react';
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
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

const TABS = [
  { id: 'summary', label: 'Сводка', icon: 'dashboard' },
  { id: 'insights', label: 'AI план', icon: 'auto-awesome' },
  { id: 'transactions', label: 'Транзакции', icon: 'receipt-long' },
  { id: 'withdrawals', label: 'Выводы', icon: 'account-balance' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const asNumber = (value) => Number(value || 0);
const formatMoney = (value) => `${Math.round(asNumber(value)).toLocaleString('ru-RU')} PRB`;
const formatPercent = (value) => `${asNumber(value).toFixed(1)}%`;

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

  const isFinanceAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [user?.id, user?.role, user?.adminLevel]);

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);

      if (!isFinanceAdmin) {
        setLoading(false);
        return;
      }

      const [summaryData, transData, withdrawData] = await Promise.all([
        apiCall(`${getApiUrl()}/admin/finances/summary`),
        apiCall(`${getApiUrl()}/admin/finances/transactions?limit=100`),
        apiCall(`${getApiUrl()}/admin/finances/withdrawals`),
      ]);

      if (!summaryData.success && summaryData.error) {
        throw new Error(summaryData.error || 'Ошибка при загрузке финансов');
      }

      setFinanceSummary(summaryData);
      setTransactions(transData.transactions || []);
      setWithdrawals(withdrawData.withdrawals || []);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить финансовые данные');
      console.error('Error loading admin finances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const model = useMemo(() => {
    const wallet = financeSummary?.wallet || {};
    const statistics = financeSummary?.statistics || {};
    const totalBalance = asNumber(wallet.totalBalance);
    const availableBalance = asNumber(wallet.availableBalance);
    const pendingBalance = asNumber(wallet.pendingBalance);
    const totalReceived = asNumber(wallet.totalReceived);
    const totalWithdrawn = asNumber(wallet.totalWithdrawn);
    const totalPayments = asNumber(statistics.totalPayments);
    const todayPayments = asNumber(statistics.todayPayments);
    const todayAmount = asNumber(statistics.todayAmount);
    const averagePayment = asNumber(statistics.averagePayment);

    const withdrawRatio = totalReceived > 0 ? (totalWithdrawn / totalReceived) * 100 : 0;
    const liquidityRatio = totalBalance > 0 ? (availableBalance / totalBalance) * 100 : 0;
    const dailyPace = Math.max(todayAmount, averagePayment * Math.max(todayPayments, 1), 1);
    const runwayDays = clamp(availableBalance / dailyPace, 0, 90);
    const forecast30 = availableBalance + (dailyPace * 30 * 0.45) - (pendingBalance * 0.2);
    const hasFinanceData = totalPayments > 0 || totalReceived > 0 || todayAmount > 0;
    const healthScore = hasFinanceData
      ? clamp(
          (liquidityRatio * 0.4) + (todayPayments * 2.5) - (withdrawRatio * 0.18) - (pendingBalance > availableBalance * 0.4 ? 10 : 0),
          5, 98
        )
      : null;
    const marketPower = clamp((totalPayments * 3) + (averagePayment / 700) + (todayAmount / 1200), 10, 96);

    const recommendations = [
      {
        title: runwayDays < 7 ? 'Удержать резерв' : 'Можно планировать вывод',
        text: runwayDays < 7
          ? 'AI видит короткий запас ликвидности. Лучше оставить деньги на балансе до стабилизации дневного потока.'
          : 'Запас ликвидности выглядит комфортно. Можно вывести часть средств, оставив рабочий резерв.',
        value: runwayDays < 7 ? 'резерв важнее вывода' : `до ${formatMoney(availableBalance * 0.25)}`,
        icon: 'savings',
        color: '#10B981',
      },
      {
        title: averagePayment < 25000 ? 'Разогнать средний платеж' : 'Защитить высокий чек',
        text: averagePayment < 25000
          ? 'Добавь платные улучшения к бронированию и bundle-предложения для популярных объектов.'
          : 'Средний платеж сильный. Делай точечные бонусы, а не широкие скидки.'
          ,
        value: averagePayment < 25000 ? '+6-10% к обороту' : 'маржа под контролем',
        icon: 'trending-up',
        color: '#06B6D4',
      },
      {
        title: pendingBalance > 0 ? 'Проверить зависшие суммы' : 'Поток чистый',
        text: pendingBalance > 0
          ? 'Есть ожидающие средства. Проверь статусы платежей и выводов, чтобы не завышать доступный cashflow.'
          : 'Ожидающих средств нет. Финансовая картина читается чисто.',
        value: formatMoney(pendingBalance),
        icon: 'rule',
        color: '#F59E0B',
      },
    ];

    return {
      totalBalance,
      availableBalance,
      pendingBalance,
      totalReceived,
      totalWithdrawn,
      totalPayments,
      todayPayments,
      todayAmount,
      averagePayment,
      withdrawRatio,
      liquidityRatio,
      runwayDays,
      forecast30,
      healthScore,
      marketPower,
      recommendations,
    };
  }, [financeSummary]);

  const handleCreateWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);

    if (!amount || !bankAccount.trim()) {
      Alert.alert('Ошибка', 'Заполните сумму и банковский счет');
      return;
    }

    if (amount <= 0) {
      Alert.alert('Ошибка', 'Сумма должна быть больше 0');
      return;
    }

    if (amount > model.availableBalance) {
      Alert.alert('Ошибка', 'Недостаточно средств на доступном балансе');
      return;
    }

    setIsWithdrawing(true);

    try {
      const data = await apiCall(`${getApiUrl()}/admin/finances/withdrawal`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          bankAccount: bankAccount.trim(),
          reason: withdrawReason.trim() || 'Запрос на вывод средств',
        }),
      });

      if (!data.success && data.error) {
        throw new Error(data.error || 'Ошибка при создании запроса');
      }

      Alert.alert('Успешно', 'Запрос на вывод создан', [
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
      Alert.alert('Ошибка', error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      booking_payment: 'Платеж за бронирование',
      topup_commission: 'Комиссия от пополнения',
      withdrawal: 'Вывод средств',
      refund: 'Возврат',
      adjustment: 'Корректировка',
    };
    return labels[type] || type;
  };

  const getWithdrawalStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#06B6D4';
      case 'completed':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getWithdrawalStatusLabel = (status) => {
    const labels = {
      pending: 'Ожидает',
      approved: 'Одобрено',
      completed: 'Завершено',
      rejected: 'Отклонено',
    };
    return labels[status] || status;
  };

  const renderSummary = () => (
    <>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon="account-balance-wallet"
          label="Общий баланс"
          value={formatMoney(model.totalBalance)}
          color={theme.colors.primary}
          theme={theme}
        />
        <KpiCard
          icon="payments"
          label="Доступно"
          value={formatMoney(model.availableBalance)}
          color="#10B981"
          theme={theme}
        />
        <KpiCard
          icon="today"
          label="Сегодня"
          value={formatMoney(model.todayAmount)}
          color="#06B6D4"
          theme={theme}
        />
        <KpiCard
          icon="receipt"
          label="Платежей"
          value={model.totalPayments.toLocaleString('ru-RU')}
          color="#8B5CF6"
          theme={theme}
        />
      </View>

      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Финансовая эффективность</Text>
        <MetricRow label="Доступная ликвидность" value={formatPercent(model.liquidityRatio)} progress={model.liquidityRatio} color="#10B981" theme={theme} />
        <MetricRow label="Доля выведенных средств" value={formatPercent(model.withdrawRatio)} progress={model.withdrawRatio} color="#F59E0B" theme={theme} />
        <MetricRow label="Средний платеж" value={formatMoney(model.averagePayment)} progress={clamp(model.averagePayment / 50000 * 100, 4, 100)} color={theme.colors.primary} theme={theme} />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowWithdrawModal(true)}
        >
          <MaterialIcons name="south-west" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Вывести</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}
          onPress={loadData}
        >
          <MaterialIcons name="refresh" size={20} color={theme.colors.primary} />
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>Обновить</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderInsights = () => (
    <>
      <View style={[styles.aiPanel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <View style={styles.aiHeader}>
          <View style={[styles.aiIcon, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="auto-awesome" size={28} color="#fff" />
          </View>
          <View style={styles.aiTextBlock}>
            <Text style={[styles.aiTitle, { color: theme.colors.text }]}>AI finance planner</Text>
            <Text style={[styles.aiSubtitle, { color: theme.colors.textSecondary }]}>
              Оценивает ликвидность, темп платежей и варианты действий для администратора
            </Text>
          </View>
        </View>

        <View style={styles.signalGrid}>
          <Signal label="Здоровье" value={model.healthScore !== null ? Math.round(model.healthScore) : '—'} color="#10B981" theme={theme} />
          <Signal label="Рынок" value={Math.round(model.marketPower)} color="#06B6D4" theme={theme} />
          <Signal label="Резерв" value={Math.round(model.runwayDays)} color="#F59E0B" suffix="д" theme={theme} />
        </View>
      </View>

      <View style={[styles.forecastPanel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Прогноз на 30 дней</Text>
        <Text style={[styles.forecastValue, { color: theme.colors.primary }]}>{formatMoney(model.forecast30)}</Text>
        <Text style={[styles.forecastText, { color: theme.colors.textSecondary }]}>
          Прогноз строится по текущему темпу платежей, доступному балансу и ожидающим суммам.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Рекомендации</Text>
      {model.recommendations.map(item => (
        <Recommendation key={item.title} item={item} theme={theme} />
      ))}
    </>
  );

  const renderTransactions = () => (
    <View style={styles.tabContent}>
      {transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={item => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isOut = item.type === 'withdrawal' || asNumber(item.amount) < 0;
            return (
              <View style={[styles.listItem, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
                <View style={[styles.listIcon, { backgroundColor: isOut ? '#EF4444' : '#10B981' }]}>
                  <MaterialIcons name={isOut ? 'south-west' : 'north-east'} size={18} color="#fff" />
                </View>
                <View style={styles.listContent}>
                  <Text style={[styles.listTitle, { color: theme.colors.text }]}>{getTransactionTypeLabel(item.type)}</Text>
                  <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleString('ru-RU')}
                  </Text>
                </View>
                <Text style={[styles.listAmount, { color: isOut ? '#EF4444' : '#10B981' }]}>
                  {isOut ? '-' : '+'}{formatMoney(Math.abs(asNumber(item.amount)))}
                </Text>
              </View>
            );
          }}
        />
      ) : (
        <EmptyState text="Транзакций пока нет" theme={theme} />
      )}
    </View>
  );

  const renderWithdrawals = () => (
    <View style={styles.tabContent}>
      {withdrawals.length > 0 ? (
        <FlatList
          data={withdrawals}
          keyExtractor={item => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const color = getWithdrawalStatusColor(item.status);
            return (
              <View style={[styles.withdrawalItem, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
                <View style={styles.withdrawalHeader}>
                  <Text style={[styles.withdrawalAmount, { color: theme.colors.text }]}>{formatMoney(item.amount)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
                    <Text style={[styles.statusText, { color }]}>{getWithdrawalStatusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text style={[styles.withdrawalAccount, { color: theme.colors.textSecondary }]}>{item.bankAccount}</Text>
                <Text style={[styles.withdrawalDate, { color: theme.colors.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleString('ru-RU')}
                </Text>
              </View>
            );
          }}
        />
      ) : (
        <EmptyState text="Запросов на вывод пока нет" theme={theme} />
      )}
    </View>
  );

  const renderTab = () => {
    switch (selectedTab) {
      case 'insights':
        return renderInsights();
      case 'transactions':
        return renderTransactions();
      case 'withdrawals':
        return renderWithdrawals();
      default:
        return renderSummary();
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isFinanceAdmin) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.noAccessContainer}>
          <MaterialIcons name="lock" size={58} color={theme.colors.primary} />
          <Text style={[styles.noAccessTitle, { color: theme.colors.text }]}>Доступ запрещен</Text>
          <Text style={[styles.noAccessText, { color: theme.colors.textSecondary }]}>
            Только администратор с финансовым доступом может просматривать эту страницу.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Вернуться</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.hero, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.heroEyebrow, { color: theme.colors.primary }]}>Финансы администратора</Text>
            <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{formatMoney(model.availableBalance)}</Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>доступно к управлению</Text>
          </View>
          {model.healthScore !== null && (
            <View style={[styles.healthBadge, { backgroundColor: '#10B98118', borderColor: '#10B98155' }]}>
              <Text style={[styles.healthValue, { color: '#10B981' }]}>{Math.round(model.healthScore)}</Text>
              <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>health</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              { backgroundColor: selectedTab === tab.id ? theme.colors.primary : theme.colors.cardBg, borderColor: theme.colors.border },
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <MaterialIcons name={tab.icon} size={18} color={selectedTab === tab.id ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.tabText, { color: selectedTab === tab.id ? '#fff' : theme.colors.text }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {renderTab()}

      <WithdrawModal
        visible={showWithdrawModal}
        theme={theme}
        financeSummary={financeSummary}
        withdrawAmount={withdrawAmount}
        bankAccount={bankAccount}
        withdrawReason={withdrawReason}
        isWithdrawing={isWithdrawing}
        onChangeAmount={setWithdrawAmount}
        onChangeBankAccount={setBankAccount}
        onChangeReason={setWithdrawReason}
        onSubmit={handleCreateWithdrawal}
        onClose={() => !isWithdrawing && setShowWithdrawModal(false)}
      />
    </ScrollView>
  );
}

function KpiCard({ icon, label, value, color, theme }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
      <View style={[styles.kpiIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={22} color="#fff" />
      </View>
      <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function MetricRow({ label, value, progress, color, theme }) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricLabel, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
        <View style={[styles.progressFill, { width: `${clamp(progress, 0, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Signal({ label, value, color, suffix = '', theme }) {
  return (
    <View style={[styles.signal, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
      <Text style={[styles.signalValue, { color }]}>{value}{suffix}</Text>
      <Text style={[styles.signalLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Recommendation({ item, theme }) {
  return (
    <View style={[styles.recommendation, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
      <View style={[styles.recommendationIcon, { backgroundColor: item.color }]}>
        <MaterialIcons name={item.icon} size={20} color="#fff" />
      </View>
      <View style={styles.recommendationContent}>
        <Text style={[styles.recommendationTitle, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>{item.text}</Text>
        <Text style={[styles.recommendationValue, { color: item.color }]}>{item.value}</Text>
      </View>
    </View>
  );
}

function EmptyState({ text, theme }) {
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name="inbox" size={46} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

function WithdrawModal({
  visible,
  theme,
  financeSummary,
  withdrawAmount,
  bankAccount,
  withdrawReason,
  isWithdrawing,
  onChangeAmount,
  onChangeBankAccount,
  onChangeReason,
  onSubmit,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.cardBg }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Запрос на вывод средств</Text>

          <View style={[styles.availableBox, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.availableLabel, { color: theme.colors.textSecondary }]}>Доступно к выводу</Text>
            <Text style={[styles.availableValue, { color: theme.colors.primary }]}>
              {formatMoney(financeSummary?.wallet?.availableBalance)}
            </Text>
          </View>

          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Сумма"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            value={withdrawAmount}
            onChangeText={onChangeAmount}
            editable={!isWithdrawing}
          />

          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Банковский счет"
            placeholderTextColor={theme.colors.textSecondary}
            value={bankAccount}
            onChangeText={onChangeBankAccount}
            editable={!isWithdrawing}
          />

          <TextInput
            style={[styles.input, styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Причина вывода"
            placeholderTextColor={theme.colors.textSecondary}
            value={withdrawReason}
            onChangeText={onChangeReason}
            multiline
            editable={!isWithdrawing}
          />

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            onPress={onSubmit}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalButtonText}>Создать запрос</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
            onPress={onClose}
            disabled={isWithdrawing}
          >
            <Text style={styles.modalButtonText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAccessContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  noAccessTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  noAccessText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: spacing.md,
  },
  hero: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  healthBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  healthValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  healthLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabsRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabText: {
    marginLeft: spacing.xs,
    fontSize: 13,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  panel: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  metricRow: {
    marginBottom: spacing.lg,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: spacing.xs,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
    marginLeft: spacing.xs,
  },
  aiPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  aiTextBlock: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  aiSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  signalGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  signal: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  signalValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  signalLabel: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  forecastPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  forecastValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  forecastText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  recommendation: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  recommendationValue: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  tabContent: {
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  listSubtitle: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  listAmount: {
    fontSize: 13,
    fontWeight: '900',
    marginLeft: spacing.sm,
  },
  withdrawalItem: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  withdrawalAccount: {
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  withdrawalDate: {
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modal: {
    width: '90%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  availableBox: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  availableLabel: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  availableValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  textArea: {
    height: 84,
    textAlignVertical: 'top',
  },
  modalButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});
