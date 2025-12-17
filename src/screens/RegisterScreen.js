import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const { register } = useAuth();

  useEffect(() => {
    const useNative = typeof window === 'undefined'; // false на web
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: useNative,
    }).start();
  }, [slideAnim]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (pwd) => {
    // Минимум 6 символов, хотя бы одна буква и одна цифра
    return pwd.length >= 6 && /[a-zA-Zа-яА-Я]/.test(pwd) && /[0-9]/.test(pwd);
  };

  const handleRegister = async () => {
    // Валидация пустых полей
    if (!displayName.trim()) {
      Alert.alert('⚠️ Ошибка валидации', 'Пожалуйста, введите ваше имя');
      return;
    }

    if (displayName.length < 2) {
      Alert.alert('⚠️ Ошибка валидации', 'Имя должно быть минимум 2 символа');
      return;
    }

    if (!email.trim()) {
      Alert.alert('⚠️ Ошибка валидации', 'Пожалуйста, введите email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('⚠️ Ошибка валидации', 'Введите корректный адрес email (например: user@example.com)');
      return;
    }

    if (!password.trim()) {
      Alert.alert('⚠️ Ошибка валидации', 'Пожалуйста, введите пароль');
      return;
    }

    if (password.length < 6) {
      Alert.alert('⚠️ Ошибка валидации', 'Пароль должен быть минимум 6 символов');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('⚠️ Слабый пароль', 'Пароль должен содержать буквы и цифры (например: Pass123)');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('⚠️ Ошибка валидации', 'Пожалуйста, подтвердите пароль');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('⚠️ Ошибка валидации', 'Пароли не совпадают. Проверьте введённые пароли');
      return;
    }

    setLoading(true);
    const success = await register(email, password, displayName);
    setLoading(false);

    if (success) {
      Alert.alert(
        '✅ Регистрация успешна',
        `Добро пожаловать, ${displayName}!\n\nПроверьте вашу почту для подтверждения.`,
        [
          {
            text: 'ОК',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } else {
      if (error && error.includes('email-already-in-use')) {
        Alert.alert('❌ Email уже зарегистрирован', 'Этот email уже используется. Попробуйте другой email или восстановите пароль');
      } else if (error && error.includes('weak-password')) {
        Alert.alert('❌ Слабый пароль', 'Пароль не соответствует требованиям безопасности');
      } else if (error && error.includes('Network')) {
        Alert.alert('❌ Ошибка сети', 'Проверьте подключение к интернету и попробуйте ещё раз');
      } else if (error && error.includes('Timeout')) {
        Alert.alert('❌ Время ожидания истекло', 'Сервер не отвечает. Попробуйте ещё раз позже');
      } else {
        Alert.alert('❌ Ошибка регистрации', error || 'Не удалось создать учётную запись. Попробуйте ещё раз');
      }
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <MaterialIcons name="person-add" size={48} color={colors.primary} />
          </View>
          <Text style={styles.appTitle}>Создать профиль</Text>
          <Text style={styles.appSubtitle}>Присоединитесь к программе лояльности</Text>
        </Animated.View>

        {/* Registration Form */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Display Name Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="person"
              size={20}
              color={colors.primary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Ваше имя"
              placeholderTextColor={colors.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              editable={!loading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="email"
              size={20}
              color={colors.primary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="lock"
              size={20}
              color={colors.primary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Пароль (минимум 6 символов)"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              disabled={!password}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={password ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="lock"
              size={20}
              color={colors.primary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Подтвердите пароль"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={!confirmPassword}
            >
              <MaterialIcons
                name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={confirmPassword ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <MaterialIcons
              name="check-circle"
              size={20}
              color="#fff"
              style={styles.buttonIcon}
            />
            <Text style={styles.registerButtonText}>
              {loading ? 'Создаём профиль...' : 'Создать профиль'}
            </Text>
          </TouchableOpacity>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              После регистрации вы сможете управлять своим профилем и использовать программу лояльности.
            </Text>
          </View>

          {/* Login Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Уже есть аккаунт? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Войти</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  appSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text,
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
