import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ScaleInCard, FadeInCard } from '../components/AnimatedCard';

export default function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [email, setEmail] = React.useState(true);
  const [instagram, setInstagram] = React.useState(false);
  const [viber, setViber] = React.useState(false);
  const [whatsapp, setWhatsapp] = React.useState(false);
  const [rulesModalVisible, setRulesModalVisible] = React.useState(false);
  const [socialsExpanded, setSocialsExpanded] = React.useState(false);
  const [platformInfo, setPlatformInfo] = React.useState('Программа лояльности Villa Jaconda v1.0.0\n\nОригинальное приложение для управления бронированиями и программой лояльности.');
  const [platformInfoModalVisible, setPlatformInfoModalVisible] = React.useState(false);
  const [isEditingPlatformInfo, setIsEditingPlatformInfo] = React.useState(false);
  const { logout, isAdmin, user } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();

  const handleSocialConnect = (platform, value, setter) => {
    if (value) {
      Alert.alert(
        `Отключить ${platform}`,
        `Вы уверены, что хотите отключить получение уведомлений в ${platform}?`,
        [
          { text: 'Отмена', onPress: () => {} },
          { text: 'Отключить', onPress: () => setter(false) },
        ]
      );
    } else {
      Alert.alert(
        `Подключить ${platform}`,
        `Чтобы подключить ${platform}, пожалуйста, отсканируйте QR-код в приложении.`,
        [{ text: 'OK', onPress: () => setter(true) }]
      );
    }
  };

  const renderSettingItem = (icon, title, description, value, onToggle, isSocial = false) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[
          styles.settingIcon, 
          { backgroundColor: isSocial ? colors.accent : colors.primary }
        ]}>
          <MaterialIcons name={icon} size={20} color="#fff" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDesc}>{description}</Text>
        </View>
      </View>
      {onToggle && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      )}
      {!onToggle && <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* User Info */}
      <View style={[styles.userCard, { backgroundColor: theme.colors.cardBg }]}>
        <View
          style={[
            styles.userAvatar,
            { backgroundColor: isAdmin ? theme.colors.secondary : theme.colors.primary },
          ]}
        >
          <MaterialIcons name={isAdmin ? 'admin-panel-settings' : 'person'} size={32} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>{user?.name || user?.displayName || 'Пользователь'}</Text>
          <Text style={[styles.userRole, { color: theme.colors.textSecondary }]}>{isAdmin ? '👤 Администратор' : '👥 Пользователь'}</Text>
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }]}>{user?.email}</Text>
        </View>
      </View>

      {/* Уведомления */}
      <View style={[styles.section, { backgroundColor: theme.colors.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Уведомления</Text>
        {renderSettingItem(
          'notifications-active',
          'Push-уведомления',
          'Получайте уведомления о событиях',
          notifications,
          setNotifications
        )}
        {renderSettingItem(
          'email',
          'Email-рассылка',
          'Получайте новости на почту',
          email,
          setEmail
        )}
      </View>

      {/* Тема оформления */}
      <View style={[styles.section, { backgroundColor: theme.colors.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Оформление</Text>
        {renderSettingItem(
          isDark ? 'brightness-4' : 'brightness-7',
          'Тёмный режим',
          isDark ? 'Включён' : 'Выключен',
          isDark,
          toggleTheme
        )}
      </View>

      {/* Социальные сети */}
      <FadeInCard delay={200} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setSocialsExpanded(!socialsExpanded)}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}>
                <MaterialIcons name="link" size={20} color="#fff" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Подключить соц сети</Text>
                <Text style={styles.settingDesc}>Получайте уведомления удобным вам способом</Text>
              </View>
            </View>
            <MaterialIcons 
              name={socialsExpanded ? 'expand-less' : 'expand-more'} 
              size={24} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          {socialsExpanded && (
            <>
              {renderSettingItem(
                'logo-instagram',
                'Instagram',
                instagram ? 'Подключено' : 'Нажмите для подключения',
                instagram,
                () => handleSocialConnect('Instagram', instagram, setInstagram),
                true
              )}

              {renderSettingItem(
                'message',
                'Viber',
                viber ? 'Подключено' : 'Нажмите для подключения',
                viber,
                () => handleSocialConnect('Viber', viber, setViber),
                true
              )}

              {renderSettingItem(
                'whatsapp',
                'WhatsApp',
                whatsapp ? 'Подключено' : 'Нажмите для подключения',
                whatsapp,
                () => handleSocialConnect('WhatsApp', whatsapp, setWhatsapp),
                true
              )}
            </>
          )}
        </View>
      </FadeInCard>

      {/* Правила программы */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Программа лояльности</Text>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setRulesModalVisible(true)}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="book" size={20} color="#fff" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Правила программы</Text>
              <Text style={styles.settingDesc}>Как работает наша программа</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setPlatformInfoModalVisible(true)}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: colors.success }]}>
              <MaterialIcons name="info" size={20} color="#fff" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>О платформе</Text>
              <Text style={styles.settingDesc}>Информация и версия</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Помощь */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Помощь</Text>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="help" size={20} color="#fff" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>FAQ</Text>
              <Text style={styles.settingDesc}>Часто задаваемые вопросы</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
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
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#E67E22' }]}>
              <MaterialIcons name="mail" size={20} color="#fff" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Связаться с нами</Text>
              <Text style={styles.settingDesc}>Выберите удобный способ</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Обзор правил */}
      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>📋 Основные правила</Text>
        <Text style={styles.rulesText}>
          • Каждая покупка дает 1% кешбека{'\n'}
          • Бонусы можно использовать как оплату{'\n'}
          • Статус зависит от накопленной суммы{'\n'}
          • Участие в аукционах автоматическое{'\n'}
          • Льготы зависят от вашего уровня
        </Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
        <MaterialIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutButtonText}>Выход</Text>
      </TouchableOpacity>

      {/* Platform Info Modal (Admin Only) */}
      {isAdmin && (
        <Modal visible={platformInfoModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>О платформе</Text>
                <TouchableOpacity onPress={() => setPlatformInfoModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {!isEditingPlatformInfo ? (
                  <>
                    <View style={styles.platformInfoCard}>
                      <MaterialIcons name="info" size={40} color={colors.primary} />
                      <Text style={styles.platformInfoText}>{platformInfo}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => setIsEditingPlatformInfo(true)}
                    >
                      <MaterialIcons name="edit" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Редактировать (только админ)</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Отредактируйте информацию:</Text>
                    <TextInput 
                      style={styles.platformEditInput}
                      multiline
                      value={platformInfo}
                      onChangeText={setPlatformInfo}
                      placeholder="Введите информацию о платформе"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.success }]}
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
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Правила программы</Text>
              <TouchableOpacity onPress={() => setRulesModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Main Rules */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>📋 Основные правила</Text>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Каждая покупка дает 1% кешбека на счет программы</Text>
                </View>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Накопленные бонусы можно использовать как оплату</Text>
                </View>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Статус участника зависит от накопленной суммы</Text>
                </View>
              </View>

              {/* Levels */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🏅 Уровни программы</Text>
                
                <View style={styles.levelCard}>
                  <View style={[styles.levelIcon, { backgroundColor: '#CD7F32' }]}>
                    <Text style={styles.levelIconText}>🥉</Text>
                  </View>
                  <View style={styles.levelInfo}>
                    <Text style={styles.levelName}>Bronze</Text>
                    <Text style={styles.levelRange}>0 - 10,000 ₽</Text>
                    <Text style={styles.levelBenefit}>+0% дополнительный кешбек</Text>
                  </View>
                </View>

                <View style={styles.levelCard}>
                  <View style={[styles.levelIcon, { backgroundColor: '#C0C0C0' }]}>
                    <Text style={styles.levelIconText}>🥈</Text>
                  </View>
                  <View style={styles.levelInfo}>
                    <Text style={styles.levelName}>Silver</Text>
                    <Text style={styles.levelRange}>10,000 - 50,000 ₽</Text>
                    <Text style={styles.levelBenefit}>+0.5% дополнительный кешбек</Text>
                  </View>
                </View>

                <View style={styles.levelCard}>
                  <View style={[styles.levelIcon, { backgroundColor: '#FFD700' }]}>
                    <Text style={styles.levelIconText}>🥇</Text>
                  </View>
                  <View style={styles.levelInfo}>
                    <Text style={styles.levelName}>Gold</Text>
                    <Text style={styles.levelRange}>50,000 - 200,000 ₽</Text>
                    <Text style={styles.levelBenefit}>+1% дополнительный кешбек</Text>
                  </View>
                </View>

                <View style={styles.levelCard}>
                  <View style={[styles.levelIcon, { backgroundColor: '#E5D4FF' }]}>
                    <Text style={styles.levelIconText}>👑</Text>
                  </View>
                  <View style={styles.levelInfo}>
                    <Text style={styles.levelName}>Platinum</Text>
                    <Text style={styles.levelRange}>200,000+ ₽</Text>
                    <Text style={styles.levelBenefit}>+2% дополнительный кешбек</Text>
                  </View>
                </View>
              </View>

              {/* Bonuses */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🎁 Бонусные возможности</Text>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Участие в эксклюзивных аукционах</Text>
                </View>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Ранний доступ к новым товарам</Text>
                </View>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Специальные предложения для платиниума</Text>
                </View>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>День рождения - дополнительный бонус</Text>
                </View>
              </View>

              {/* Conditions */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>⚠️ Условия</Text>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Кешбек не накапливается на возвраты</Text>
                </View>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Статус уменьшается при отсутствии активности 12 месяцев</Text>
                </View>
                <View style={styles.ruleItem}>
                  <View style={styles.ruleBullet} />
                  <Text style={styles.ruleItemText}>Бонусы не переводятся другим пользователям</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
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
    color: colors.text,
  },
  userRole: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: colors.cardBg,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingItem_last: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
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
    color: colors.text,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rulesCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  rulesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  rulesText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.danger,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: spacing.md,
  },
  rulesSection: {
    marginBottom: spacing.lg,
  },
  rulesSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  ruleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    flexShrink: 0,
  },
  ruleItemText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    flex: 1,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  levelRange: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  levelBenefit: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
});

