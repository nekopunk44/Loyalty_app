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
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const { login, error } = useAuth();

  useEffect(() => {
    // Определить поддерживается ли useNativeDriver (только на мобильных)
    const useNative = typeof window === 'undefined'; // false на web
    
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: useNative,
    }).start();
  }, [slideAnim]);

  const handleLogin = async () => {
    // Валидация входных данных
    if (!username.trim()) {
      Alert.alert('⚠️ Ошибка валидации', 'Пожалуйста, введите email или имя пользователя');
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

    if (username.includes('@') && !username.includes('.')) {
      Alert.alert('⚠️ Ошибка валидации', 'Email должен содержать точку (например: user@example.com)');
      return;
    }

    setLoading(true);
    const success = await login(username, password);
    setLoading(false);

    if (!success) {
      if (error && error.includes('user-not-found')) {
        Alert.alert('❌ Пользователь не найден', 'Пользователь с такими учётными данными не существует');
      } else if (error && error.includes('wrong-password')) {
        Alert.alert('❌ Неверный пароль', 'Пароль неверный. Попробуйте ещё раз');
      } else if (error && error.includes('Network')) {
        Alert.alert('❌ Ошибка сети', 'Проверьте подключение к интернету и попробуйте ещё раз');
      } else if (error && error.includes('Timeout')) {
        Alert.alert('❌ Время ожидания истекло', 'Сервер не отвечает. Попробуйте ещё раз');
      } else {
        Alert.alert('❌ Ошибка входа', error || 'Неверные учётные данные. Попробуйте ещё раз');
      }

    }
  };

  const handleDemoLogin = async (demoUsername) => {
    setUsername(demoUsername);
    setPassword(MOCK_PASSWORDS[demoUsername]);
    // Slightly delayed so the state updates
    setTimeout(() => {
      handleLogin();
    }, 100);
  };

  const MOCK_PASSWORDS = {
    admin: 'admin123',
    user: 'user123',
    demo: 'demo123',
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
        {/* Header with animation */}
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
            <MaterialIcons name="card-giftcard" size={64} color={colors.primary} />
          </View>
          <Text style={styles.appTitle}>Villa Jaconda</Text>
          <Text style={styles.appSubtitle}>Программа лояльности</Text>
        </Animated.View>

        {/* Login Form */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Username Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="person"
              size={20}
              color={colors.primary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Логин (admin, user, demo)"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              editable={!loading}
              autoCapitalize="none"
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
              placeholder="Пароль"
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

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
            ) : (
              <MaterialIcons
                name="login"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
            )}
            <Text style={styles.loginButtonText}>
              {loading ? 'Входим...' : 'Войти'}
            </Text>
          </TouchableOpacity>

          {/* Loading Status Message */}
          {loading && (
            <View style={styles.loadingStatus}>
              <Text style={styles.loadingStatusText}>
                ⏳ Подключение к приложению, пожалуйста подождите...
              </Text>
            </View>
          )}

          {/* Demo Credentials */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Тестовые учётные данные:</Text>
            <TouchableOpacity
              style={[styles.demoButton, { backgroundColor: colors.secondary }]}
              onPress={() => handleDemoLogin('admin')}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>👤 admin / admin123</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoButton, { backgroundColor: colors.primary }]}
              onPress={() => handleDemoLogin('user')}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>👥 user / user123</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoButton, { backgroundColor: colors.accent }]}
              onPress={() => handleDemoLogin('demo')}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>🎯 demo / demo123</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Info */}
          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Используйте тестовые учётные данные для демонстрации функций приложения.
            </Text>
          </View>

          {/* Register Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Новый пользователь? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Создать профиль</Text>
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
  loginButton: {
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
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  demoSection: {
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  demoTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  demoButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingStatus: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#E8F4FD',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  loadingStatusText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
});
