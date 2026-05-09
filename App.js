import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

// В production глушим console.* чтобы не течь отладочная информация
if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
  console.error = noop;
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StatusBar, Platform, Animated } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from './src/constants/theme';
import NotificationBell from './src/components/ui/NotificationBell';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { BookingProvider } from './src/context/BookingContext';
import { ReferralProvider } from './src/context/ReferralContext';
import { PaymentProvider } from './src/context/PaymentContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AnalyticsProvider } from './src/context/AnalyticsContext';
import { EventProvider } from './src/context/EventContext';
import { UserDataProvider } from './src/context/UserDataContext';

// Auth screens
import LoginTransitionOverlay from './src/components/auth/LoginTransitionOverlay';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import SplashScreen from './src/screens/auth/SplashScreen';

// User screens
import HomeScreen from './src/screens/user/HomeScreen';
import BookingScreen from './src/screens/user/BookingScreen';
import CheckoutScreen from './src/screens/user/CheckoutScreen';
import MyCardScreen from './src/screens/user/MyCardScreen';
import CardTopUpScreen from './src/screens/user/CardTopUpScreen';
import EventsScreen from './src/screens/user/EventsScreen';
import SettingsScreen from './src/screens/user/SettingsScreen';
import NotificationCenter from './src/screens/user/NotificationCenter';
import ProfileScreen from './src/screens/user/ProfileScreen';
import ShopScreen from './src/screens/user/ShopScreen';

// Admin screens
import AdminDashboard from './src/screens/admin/AdminDashboard';
import AdminFinanceDashboard from './src/screens/admin/AdminFinanceDashboard';
import AdminEvents from './src/screens/admin/AdminEvents';
import AdminStats from './src/screens/admin/AdminStats';
import AdminUsers from './src/screens/admin/AdminUsers';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function withTabTransition(Component) {
  function TransitionWrapper(props) {
    const opacity   = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(10)).current;

    useFocusEffect(useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(10);
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 210, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 210, useNativeDriver: true }),
      ]).start();
    }, []));

    return (
      <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
        <Component {...props} />
      </Animated.View>
    );
  }
  TransitionWrapper.displayName = `Tab(${Component.displayName || Component.name})`;
  return TransitionWrapper;
}

const HomeTab        = withTabTransition(HomeScreen);
const BookingTab     = withTabTransition(BookingScreen);
const MyCardTab      = withTabTransition(MyCardScreen);
const EventsTab      = withTabTransition(EventsScreen);
const SettingsTab    = withTabTransition(SettingsScreen);
const DashboardTab   = withTabTransition(AdminDashboard);
const AdminEventsTab = withTabTransition(AdminEvents);
const AdminUsersTab  = withTabTransition(AdminUsers);
const AdminFinanceTab = withTabTransition(AdminFinanceDashboard);
const AdminStatsTab  = withTabTransition(AdminStats);

// User Navigation
function UserTabs() {
  const { theme } = useTheme();
  const themeColors = theme.colors;
  
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: themeColors.primary,
          elevation: 3,
          shadowOpacity: 0.2,
        },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.cardBg,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        tabBarShowLabel: false,
        headerRight: () => <NotificationBell color="#fff" />,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Booking') iconName = 'event-note';
          else if (route.name === 'Profile') iconName = 'account-circle';
          else if (route.name === 'Events') iconName = 'event';
          else if (route.name === 'Settings') iconName = 'settings';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        animationEnabled: true,
      })}
    >
      <Tab.Screen name="Home"     component={HomeTab}     options={{ title: 'Главная' }} />
      <Tab.Screen name="Booking"  component={BookingTab}  options={{ title: 'Забронировать' }} />
      <Tab.Screen name="Profile"  component={MyCardTab}   options={{ title: 'Моя карта' }} />
      <Tab.Screen name="Events"   component={EventsTab}   options={{ title: 'События' }} />
      <Tab.Screen name="Settings" component={SettingsTab} options={{ title: 'Настройки' }} />
    </Tab.Navigator>
  );
}

// User Stack with Checkout
function UserStack() {
  const { theme } = useTheme();
  const themeColors = theme.colors;
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="UserTabs"
        component={UserTabs}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{
          headerShown: true,
          headerTitle: 'Оформление покупки',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: themeColors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 16,
          },
        }}
      />
      <Stack.Screen
        name="CardTopUp"
        component={CardTopUpScreen}
        options={{
          headerShown: true,
          headerTitle: 'Пополнить баланс',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: themeColors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 16,
          },
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          headerTitle: 'Профиль',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          headerShown: true,
          headerTitle: 'Магазин',
          headerTitleAlign: 'center',
        }}
      />
    </Stack.Navigator>
  );
}

// Admin Navigation
function AdminTabs() {
  const { theme } = useTheme();
  const themeColors = theme.colors;
  
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: themeColors.secondary,
          elevation: 3,
          shadowOpacity: 0.2,
        },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        tabBarActiveTintColor: themeColors.secondary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.cardBg,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'dashboard';
          if (route.name === 'Dashboard') iconName = 'dashboard';
          else if (route.name === 'AdminEvents') iconName = 'event-note';
          else if (route.name === 'AdminUsers') iconName = 'people';
          else if (route.name === 'AdminFinance') iconName = 'attach-money';
          else if (route.name === 'AdminStats') iconName = 'bar-chart';
          else if (route.name === 'AdminSettings') iconName = 'settings';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        animationEnabled: true,
      })}
    >
      <Tab.Screen name="Dashboard"    component={DashboardTab}   options={{ title: 'Панель администратора' }} />
      <Tab.Screen name="AdminEvents"  component={AdminEventsTab} options={{ title: 'События' }} />
      <Tab.Screen name="AdminUsers"   component={AdminUsersTab}  options={{ title: 'Пользователи' }} />
      <Tab.Screen name="AdminFinance" component={AdminFinanceTab} options={{ title: 'Финансы' }} />
      <Tab.Screen name="AdminStats"   component={AdminStatsTab}  options={{ title: 'Статистика' }} />
      <Tab.Screen name="AdminSettings" component={SettingsTab}   options={{ title: 'Настройки' }} />
    </Tab.Navigator>
  );
}

function AdminStack() {
  const { theme } = useTheme();
  const themeColors = theme.colors;
  
  return (
    <Stack.Navigator
      screenOptions={{
        animationEnabled: true,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen
        name="AdminTabs"
        component={AdminTabs}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Root Navigator
function RootNavigator() {
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {!isLoggedIn ? (
        <>
          <Stack.Screen 
            name="Splash" 
            component={SplashScreen}
            options={{ 
              animationEnabled: false,
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{
              animationEnabled: true,
              headerShown: true,
              headerTitle: 'Регистрация',
              headerStyle: {
                backgroundColor: colors.primary,
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: '700',
                fontSize: 18,
              },
            }}
          />
        </>
      ) : isAdmin ? (
        <Stack.Screen name="AdminHome" component={AdminStack} />
      ) : (
        <Stack.Screen name="UserHome" component={UserStack} />
      )}
    </Stack.Navigator>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <UserDataProvider>
              <EventProvider>
                <NotificationProvider>
                  <AnalyticsProvider>
                    <BookingProvider>
                      <ReferralProvider>
                        <PaymentProvider>
                          <NavigationContainerWrapper />
                        </PaymentProvider>
                      </ReferralProvider>
                    </BookingProvider>
                  </AnalyticsProvider>
                </NotificationProvider>
              </EventProvider>
            </UserDataProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);

// Компонент для применения темы к NavigationContainer
function NavigationContainerWrapper() {
  const { isDark, theme, isThemeLoaded } = useTheme();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('user');
  const prevIsLoggedIn = useRef(false);

  useEffect(() => {
    if (!isLoading && isLoggedIn && !prevIsLoggedIn.current) {
      setTransitionType(isAdmin ? 'admin' : 'user');
      setShowTransition(true);
    }
    prevIsLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, isLoading, isAdmin]);

  if (!isThemeLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // Создаём тему для навигации на основе текущей темы
  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.cardBg,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.accent,
    },
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? theme.colors.background : theme.colors.primary}
        translucent={Platform.OS === 'android'}
      />
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
      {showTransition && (
        <LoginTransitionOverlay
          type={transitionType}
          onComplete={() => setShowTransition(false)}
        />
      )}
    </>
  );
}
