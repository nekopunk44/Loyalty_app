import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput, Animated } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme, lightTheme, darkTheme } from '../context/ThemeContext';
import { ScaleInCard, FadeInCard } from '../components/AnimatedCard';
import NotificationCenter from './NotificationCenter';

export default function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [notificationsAnim] = React.useState(new Animated.Value(notifications ? 1 : 0));
  const [rulesModalVisible, setRulesModalVisible] = React.useState(false);
  const [notificationCenterVisible, setNotificationCenterVisible] = React.useState(false);
  const [platformInfo, setPlatformInfo] = React.useState('Программа лояльности Villa Jaconda v1.0.0\n\nОригинальное приложение для управления бронированиями и программой лояльности.');
  const [platformInfoModalVisible, setPlatformInfoModalVisible] = React.useState(false);
  const [isEditingPlatformInfo, setIsEditingPlatformInfo] = React.useState(false);
  const { logout, isAdmin, user } = useAuth();
  const { isDark, toggleTheme, theme, isThemeLoaded } = useTheme();

  // Инициализируем анимации с правильным значением темы
  const [darkModeAnim] = React.useState(new Animated.Value(isThemeLoaded ? (isDark ? 1 : 0) : 0));
  const [bgColorAnim] = React.useState(new Animated.Value(isThemeLoaded ? (isDark ? 1 : 0) : 0));
  const [cardColorAnim] = React.useState(new Animated.Value(isThemeLoaded ? (isDark ? 1 : 0) : 0));
  const [textColorAnim] = React.useState(new Animated.Value(isThemeLoaded ? (isDark ? 1 : 0) : 0));

  // Синхронизируем анимации с текущей темой после загрузки
  React.useEffect(() => {
    if (isThemeLoaded) {
      darkModeAnim.setValue(isDark ? 1 : 0);
      bgColorAnim.setValue(isDark ? 1 : 0);
      cardColorAnim.setValue(isDark ? 1 : 0);
      textColorAnim.setValue(isDark ? 1 : 0);
    }
  }, [isThemeLoaded]);

  const handleThemeToggle = () => {
    // Плавная анимация переключателя темы и цветов элементов
    Animated.parallel([
      Animated.timing(darkModeAnim, {
        toValue: isDark ? 0 : 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(bgColorAnim, {
        toValue: isDark ? 0 : 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(cardColorAnim, {
        toValue: isDark ? 0 : 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(textColorAnim, {
        toValue: isDark ? 0 : 1,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
    
    toggleTheme();
  };

  // Создаём стили динамически на основе текущей темы
  const dynamicStyles = React.useMemo(() => {
    return StyleSheet.create({
      container: {
        backgroundColor: theme.colors.background,
        paddingVertical: spacing.md,
        flexGrow: 1,
      },
      userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.cardBg,
        marginHorizontal: spacing.md,
        marginBottom: spacing.lg,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
      },
      userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
      },
      userName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
      },
      userRole: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: spacing.xs,
      },
      userEmail: {
        fontSize: 12,
        color: theme.colors.textSecondary,
      },
      section: {
        marginBottom: spacing.lg,
        backgroundColor: theme.colors.cardBg,
        marginHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
      },
      sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        letterSpacing: 0.5,
      },
      settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
      },
      settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
      },
      settingText: {
        flex: 1,
      },
      settingTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
      },
      settingDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
      },
      toggleSwitch: {
        width: 50,
        height: 28,
        borderRadius: 14,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'flex-start',
      },
      toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
      },
      rulesCard: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.lg,
        backgroundColor: theme.colors.cardBg,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
      },
      rulesTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: spacing.sm,
      },
      rulesText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
      },
      logoutButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        marginVertical: spacing.lg,
        backgroundColor: theme.colors.danger,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
      },
      logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: spacing.sm,
      },
      modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
      },
      modalContent: {
        backgroundColor: theme.colors.cardBg,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '95%',
        borderTopWidth: 2,
        borderTopColor: theme.colors.primary,
      },
      modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
      },
      modalBody: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
      },
      platformInfoCard: {
        backgroundColor: theme.colors.background,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        alignItems: 'center',
      },
      platformInfoText: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: spacing.md,
        textAlign: 'center',
        lineHeight: 20,
      },
      platformEditInput: {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        color: theme.colors.text,
        minHeight: 100,
      },
      actionButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
      },
      actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: spacing.sm,
      },
      rulesSection: {
        marginBottom: spacing.xl,
      },
      rulesSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.primary,
      },
      ruleItem: {
        flexDirection: 'row',
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
      },
      ruleBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
        marginRight: spacing.md,
        marginTop: 6,
        flexShrink: 0,
      },
      ruleItemText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 22,
      },
      levelCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
      },
      levelIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        flexShrink: 0,
      },
      levelIconText: {
        fontSize: 24,
      },
      levelInfo: {
        flex: 1,
      },
      levelName: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: spacing.xs,
      },
      levelRange: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: spacing.xs,
        fontWeight: '500',
      },
      levelBenefit: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '600',
      },
    });
  }, [theme]);

  const handleNotificationsToggle = (value) => {
    setNotifications(value);
    // Плавная анимация переключателя
    Animated.timing(notificationsAnim, {
      toValue: value ? 1 : 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
    
    if (value) {
      Alert.alert(
        'Push-уведомления включены',
        'Вы будете получать уведомления о бронированиях, промоакциях и других важных событиях.',
        [{ text: 'OK', onPress: () => {} }]
      );
    } else {
      Alert.alert(
        'Push-уведомления отключены',
        'Вы не будете получать push-уведомления до включения этой опции.',
        [{ text: 'OK', onPress: () => {} }]
      );
    }
  };

  const renderSettingItem = (icon, title, description, value, onToggle, isSocial = false, animValue = null) => {
    const translateX = animValue ? animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 24],
    }) : (value ? 24 : 2);

    return (
      <View style={dynamicStyles.settingItem}>
        <View style={dynamicStyles.settingLeft}>
          <View style={[
            dynamicStyles.settingIcon, 
            { backgroundColor: isSocial ? theme.colors.accent : theme.colors.primary }
          ]}>
            <MaterialIcons name={icon} size={20} color="#fff" />
          </View>
          <View style={dynamicStyles.settingText}>
            <Text style={[dynamicStyles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[dynamicStyles.settingDesc, { color: theme.colors.textSecondary }]}>{description}</Text>
          </View>
        </View>
        {onToggle && (
          <TouchableOpacity 
            style={[
              dynamicStyles.toggleSwitch,
              { backgroundColor: value ? theme.colors.primary : theme.colors.border }
            ]}
            onPress={() => onToggle(!value)}
            activeOpacity={0.8}
          >
            <Animated.View 
              style={[
                dynamicStyles.toggleThumb,
                { 
                  transform: [{ translateX }],
                  backgroundColor: '#fff'
                }
              ]}
            >
              <MaterialIcons 
                name={value ? 'check' : 'close'} 
                size={14} 
                color={value ? theme.colors.primary : theme.colors.border}
              />
            </Animated.View>
          </TouchableOpacity>
        )}
        {!onToggle && <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView 
        contentContainerStyle={[
          dynamicStyles.container, 
          {
            backgroundColor: bgColorAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [lightTheme.colors.background, darkTheme.colors.background],
            }),
          }
        ]}
      >
      {/* User Info */}
      <Animated.View style={[dynamicStyles.userCard, { 
        backgroundColor: cardColorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [lightTheme.colors.cardBg, darkTheme.colors.cardBg],
        })
      }]}>
        <View
          style={[
            dynamicStyles.userAvatar,
            { backgroundColor: isAdmin ? theme.colors.secondary : theme.colors.primary },
          ]}
        >
          <MaterialIcons name={isAdmin ? 'admin-panel-settings' : 'person'} size={32} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[dynamicStyles.userName, { color: theme.colors.text }]}>{user?.name || user?.displayName || 'Пользователь'}</Text>
          <Text style={[dynamicStyles.userRole, { color: theme.colors.textSecondary }]}>{isAdmin ? '👤 Администратор' : '👥 Пользователь'}</Text>
          <Text style={[dynamicStyles.userEmail, { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }]}>{user?.email}</Text>
        </View>
      </Animated.View>

      {/* Уведомления */}
      <Animated.View style={[dynamicStyles.section, { 
        backgroundColor: cardColorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [lightTheme.colors.cardBg, darkTheme.colors.cardBg],
        })
      }]}>
        <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.textSecondary }]}>Уведомления</Text>
        {renderSettingItem(
          'notifications-active',
          'Push-уведомления',
          'Получайте уведомления о событиях',
          notifications,
          handleNotificationsToggle,
          false,
          notificationsAnim
        )}
        <TouchableOpacity
          style={dynamicStyles.settingItem}
          onPress={() => setNotificationCenterVisible(true)}
        >
          <View style={dynamicStyles.settingLeft}>
            <View style={[dynamicStyles.settingIcon, { backgroundColor: theme.colors.primary }]}>
              <MaterialIcons name="notifications" size={20} color="#fff" />
            </View>
            <View style={dynamicStyles.settingText}>
              <Text style={[dynamicStyles.settingTitle, { color: theme.colors.text }]}>Центр уведомлений</Text>
              <Text style={[dynamicStyles.settingDesc, { color: theme.colors.textSecondary }]}>Просмотрите все уведомления</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Тема оформления */}
      <Animated.View style={[dynamicStyles.section, { 
        backgroundColor: cardColorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [lightTheme.colors.cardBg, darkTheme.colors.cardBg],
        })
      }]}>
        <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.textSecondary }]}>Оформление</Text>
        {renderSettingItem(
          isDark ? 'brightness-4' : 'brightness-7',
          'Тёмный режим',
          isDark ? 'Включён' : 'Выключен',
          isDark,
          handleThemeToggle,
          false,
          darkModeAnim
        )}
      </Animated.View>

      {/* Правила программы */}
      <Animated.View style={[dynamicStyles.section, { 
        backgroundColor: cardColorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [lightTheme.colors.cardBg, darkTheme.colors.cardBg],
        })
      }]}>
        <Text style={dynamicStyles.sectionTitle}>Программа лояльности</Text>
        <TouchableOpacity 
          style={dynamicStyles.settingItem}
          onPress={() => setRulesModalVisible(true)}
        >
          <View style={dynamicStyles.settingLeft}>
            <View style={[dynamicStyles.settingIcon, { backgroundColor: theme.colors.accent }]}>
              <MaterialIcons name="book" size={20} color="#fff" />
            </View>
            <View style={dynamicStyles.settingText}>
              <Text style={[dynamicStyles.settingTitle, { color: theme.colors.text }]}>Правила программы</Text>
              <Text style={[dynamicStyles.settingDesc, { color: theme.colors.textSecondary }]}>Как работает наша программа</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={dynamicStyles.settingItem}
          onPress={() => setPlatformInfoModalVisible(true)}
        >
          <View style={dynamicStyles.settingLeft}>
            <View style={[dynamicStyles.settingIcon, { backgroundColor: theme.colors.success }]}>
              <MaterialIcons name="info" size={20} color="#fff" />
            </View>
            <View style={dynamicStyles.settingText}>
              <Text style={[dynamicStyles.settingTitle, { color: theme.colors.text }]}>О платформе</Text>
              <Text style={[dynamicStyles.settingDesc, { color: theme.colors.textSecondary }]}>Информация и версия</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Помощь */}
      <Animated.View style={[dynamicStyles.section, { 
        backgroundColor: cardColorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [lightTheme.colors.cardBg, darkTheme.colors.cardBg],
        })
      }]}>
        <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.textSecondary }]}>Помощь</Text>
        <TouchableOpacity style={dynamicStyles.settingItem}>
          <View style={dynamicStyles.settingLeft}>
            <View style={[dynamicStyles.settingIcon, { backgroundColor: theme.colors.secondary }]}>
              <MaterialIcons name="help" size={20} color="#fff" />
            </View>
            <View style={dynamicStyles.settingText}>
              <Text style={[dynamicStyles.settingTitle, { color: theme.colors.text }]}>FAQ</Text>
              <Text style={[dynamicStyles.settingDesc, { color: theme.colors.textSecondary }]}>Часто задаваемые вопросы</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={dynamicStyles.settingItem}
          onPress={() => Alert.alert(
            '📱 Свяжитесь с нами',
            'Выберите удобный способ связи:',
            [
              {
                text: '📧 Почта (support@villajaconda.ru)',
                onPress: () => Alert.alert('✉️', 'Электронная почта скопирована в буфер обмена'),
              },
              {
                text: '💬 Viber',
                onPress: () => Alert.alert('✓', 'Открыть Viber: +7 (XXX) XXX-XX-XX'),
              },
              {
                text: '✈️ Telegram (@villajaconda)',
                onPress: () => Alert.alert('✓', 'Открыть Telegram: @villajaconda'),
              },
              {
                text: '📸 Instagram (@villajaconda)',
                onPress: () => Alert.alert('✓', 'Открыть Instagram: @villajaconda'),
              },
              {
                text: '💚 WhatsApp',
                onPress: () => Alert.alert('✓', 'Открыть WhatsApp: +7 (XXX) XXX-XX-XX'),
              },
              { text: 'Отмена', style: 'cancel' },
            ]
          )}
        >
          <View style={dynamicStyles.settingLeft}>
            <View style={[dynamicStyles.settingIcon, { backgroundColor: '#E67E22' }]}>
              <MaterialIcons name="mail" size={20} color="#fff" />
            </View>
            <View style={dynamicStyles.settingText}>
              <Text style={[dynamicStyles.settingTitle, { color: theme.colors.text }]}>Связаться с нами</Text>
              <Text style={[dynamicStyles.settingDesc, { color: theme.colors.textSecondary }]}>Выберите удобный способ</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Обзор правил */}
      <Animated.View style={[dynamicStyles.rulesCard, { 
        backgroundColor: cardColorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [lightTheme.colors.cardBg, darkTheme.colors.cardBg],
        })
      }]}>
        <Text style={[dynamicStyles.rulesTitle, { color: theme.colors.text }]}>📋 Основные правила</Text>
        <Text style={[dynamicStyles.rulesText, { color: theme.colors.textSecondary }]}>
          • Каждая покупка дает 1% кешбека{'\n'}
          • Бонусы можно использовать как оплату{'\n'}
          • Статус зависит от накопленной суммы{'\n'}
          • Участие в аукционах автоматическое{'\n'}
          • Льготы зависят от вашего уровня
        </Text>
      </Animated.View>

      {/* Logout Button */}
      <TouchableOpacity style={dynamicStyles.logoutButton} onPress={() => logout()}>
        <MaterialIcons name="logout" size={20} color="#fff" />
        <Text style={dynamicStyles.logoutButtonText}>Выход</Text>
      </TouchableOpacity>

      {/* Platform Info Modal (Admin Only) */}
      {isAdmin && (
        <Modal visible={platformInfoModalVisible} animationType="slide" transparent>
          <View style={dynamicStyles.modalContainer}>
            <View style={dynamicStyles.modalContent}>
              <View style={dynamicStyles.modalHeader}>
                <Text style={dynamicStyles.modalTitle}>О платформе</Text>
                <TouchableOpacity onPress={() => setPlatformInfoModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={dynamicStyles.modalBody}>
                {!isEditingPlatformInfo ? (
                  <>
                    <TouchableOpacity 
                      style={[dynamicStyles.actionButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setIsEditingPlatformInfo(true)}
                    >
                      <MaterialIcons name="edit" size={20} color="#fff" />
                      <Text style={dynamicStyles.actionButtonText}>Редактировать (только админ)</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>Отредактируйте информацию:</Text>
                    <TextInput 
                      style={[dynamicStyles.platformEditInput, { color: theme.colors.text, backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}
                      multiline
                      value={platformInfo}
                      onChangeText={setPlatformInfo}
                      placeholder="Введите информацию о платформе"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                    <TouchableOpacity 
                      style={[dynamicStyles.actionButton, { backgroundColor: theme.colors.success }]}
                      onPress={() => setIsEditingPlatformInfo(false)}
                    >
                      <MaterialIcons name="check" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Сохранить</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Rules Modal */}
      <Modal visible={rulesModalVisible} animationType="slide" transparent>
        <View style={[dynamicStyles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[dynamicStyles.modalContent, { backgroundColor: theme.colors.cardBg }]}>
            {/* Header */}
            <View style={dynamicStyles.modalHeader}>
              <Text style={[dynamicStyles.modalTitle, { color: theme.colors.text }]}>Правила программы</Text>
              <TouchableOpacity onPress={() => setRulesModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={dynamicStyles.modalBody}>
              {/* Main Rules */}
              <View style={dynamicStyles.rulesSection}>
                <Text style={[dynamicStyles.rulesSectionTitle, { color: theme.colors.text }]}>📋 Основные правила</Text>
                <View style={dynamicStyles.ruleItem}>
                  <View style={[dynamicStyles.ruleBullet, { backgroundColor: theme.colors.primary }]} />
                  <Text style={[dynamicStyles.ruleItemText, { color: theme.colors.text }]}>Каждая покупка дает 1% кешбека на счет программы</Text>
                </View>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>Накопленные бонусы можно использовать как оплату</Text>
                </View>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>Статус участника зависит от накопленной суммы</Text>
                </View>
              </View>

              {/* Levels */}
              <View style={dynamicStyles.rulesSection}>
                <Text style={dynamicStyles.rulesSectionTitle}>🏅 Уровни программы</Text>
                
                <View style={dynamicStyles.levelCard}>
                  <View style={[dynamicStyles.levelIcon, { backgroundColor: '#CD7F32' }]}>
                    <Text style={dynamicStyles.levelIconText}>🥉</Text>
                  </View>
                  <View style={dynamicStyles.levelInfo}>
                    <Text style={dynamicStyles.levelName}>Bronze</Text>
                    <Text style={dynamicStyles.levelRange}>0 - 10,000 PRB</Text>
                    <Text style={dynamicStyles.levelBenefit}>+0% дополнительный кешбек</Text>
                  </View>
                </View>

                <View style={dynamicStyles.levelCard}>
                  <View style={[dynamicStyles.levelIcon, { backgroundColor: '#C0C0C0' }]}>
                    <Text style={dynamicStyles.levelIconText}>🥈</Text>
                  </View>
                  <View style={dynamicStyles.levelInfo}>
                    <Text style={dynamicStyles.levelName}>Silver</Text>
                    <Text style={dynamicStyles.levelRange}>10,000 - 50,000 PRB</Text>
                    <Text style={dynamicStyles.levelBenefit}>+0.5% дополнительный кешбек</Text>
                  </View>
                </View>

                <View style={dynamicStyles.levelCard}>
                  <View style={[dynamicStyles.levelIcon, { backgroundColor: '#FFD700' }]}>
                    <Text style={dynamicStyles.levelIconText}>🥇</Text>
                  </View>
                  <View style={dynamicStyles.levelInfo}>
                    <Text style={dynamicStyles.levelName}>Gold</Text>
                    <Text style={dynamicStyles.levelRange}>50,000 - 200,000 PRB</Text>
                    <Text style={dynamicStyles.levelBenefit}>+1% дополнительный кешбек</Text>
                  </View>
                </View>

                <View style={dynamicStyles.levelCard}>
                  <View style={[dynamicStyles.levelIcon, { backgroundColor: '#E5D4FF' }]}>
                    <Text style={dynamicStyles.levelIconText}>👑</Text>
                  </View>
                  <View style={dynamicStyles.levelInfo}>
                    <Text style={dynamicStyles.levelName}>Platinum</Text>
                    <Text style={dynamicStyles.levelRange}>200,000+ PRB</Text>
                    <Text style={dynamicStyles.levelBenefit}>+2% дополнительный кешбек</Text>
                  </View>
                </View>
              </View>

              {/* Bonuses */}
              <View style={dynamicStyles.rulesSection}>
                <Text style={dynamicStyles.rulesSectionTitle}>🎁 Бонусные возможности</Text>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>Участие в эксклюзивных аукционах</Text>
                </View>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>Ранний доступ к новым товарам</Text>
                </View>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>Специальные предложения для платиниума</Text>
                </View>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>День рождения - дополнительный бонус</Text>
                </View>
              </View>

              {/* Conditions */}
              <View style={dynamicStyles.rulesSection}>
                <Text style={dynamicStyles.rulesSectionTitle}>⚠️ Условия</Text>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>Кешбек не накапливается на возвраты</Text>
                </View>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>Статус уменьшается при отсутствии активности 12 месяцев</Text>
                </View>
                <View style={dynamicStyles.ruleItem}>
                  <View style={dynamicStyles.ruleBullet} />
                  <Text style={dynamicStyles.ruleItemText}>Бонусы не переводятся другим пользователям</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notification Center Modal */}
      <Modal 
        visible={notificationCenterVisible} 
        animationType="slide" 
        transparent={false}
        onRequestClose={() => setNotificationCenterVisible(false)}
      >
        <NotificationCenter onClose={() => setNotificationCenterVisible(false)} />
      </Modal>
      </Animated.ScrollView>
    </View>
  );
}

