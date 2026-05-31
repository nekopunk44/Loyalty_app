import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StatusBar, Platform, Animated, StyleSheet, Keyboard } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NAVY as USER_NAVY } from './src/constants/loginPalette';
import NotificationBell from './src/components/ui/NotificationBell';
import OfflineBanner from './src/components/ui/OfflineBanner';
import AppProviders from './src/app/AppProviders';
import { useAuth } from './src/context/AuthContext';
import { useTheme } from './src/context/ThemeContext';

// Auth screens
import LoginTransitionOverlay from './src/components/auth/LoginTransitionOverlay';
import LoginScreen from './src/screens/auth/LoginScreen';
import SplashScreen from './src/screens/auth/SplashScreen';

// User screens
import HomeScreen from './src/screens/user/HomeScreen';
import BookingScreen, { preloadBookingImages } from './src/screens/user/BookingScreen';
import CheckoutScreen from './src/screens/user/CheckoutScreen';
import MyCardScreen from './src/screens/user/MyCardScreen';
import CardTopUpScreen from './src/screens/user/CardTopUpScreen';
import AuctionDetailScreen from './src/screens/user/AuctionDetailScreen';
import MyBidsScreen from './src/screens/user/MyBidsScreen';
import EventsScreen from './src/screens/user/EventsScreen';
import SettingsScreen from './src/screens/user/SettingsScreen';
import ProfileScreen from './src/screens/user/ProfileScreen';

// Admin screens
import AdminDashboard from './src/screens/admin/AdminDashboard';
import AdminFinanceDashboard from './src/screens/admin/AdminFinanceDashboard';
import AdminEvents from './src/screens/admin/AdminEvents';
import AdminStats from './src/screens/admin/AdminStats';
import AdminUsers from './src/screens/admin/AdminUsers';
import AdminChurnRisk from './src/screens/admin/AdminChurnRisk';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

// В production глушим отладочный вывод, но оставляем console.error для Sentry
if (!__DEV__) {
  const noop = () => {};
  // eslint-disable-next-line no-console
  console.log = console.info = console.warn = console.debug = noop;
  // console.error намеренно НЕ отключается — нужен для ErrorBoundary и Sentry
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HEADER_RADIUS = 28;
const USER_HEADER_LIGHT = '#F2C6A2';
const USER_HEADER_DARK = '#0B5F73';

function isIntegratedHeaderRoute(routeName) {
  return routeName === 'Home' || routeName === 'Settings';
}

function RoundedHeaderBackground({ color, underlayColor }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: underlayColor || 'transparent' }]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: color,
            borderBottomLeftRadius: HEADER_RADIUS,
            borderBottomRightRadius: HEADER_RADIUS,
            overflow: 'hidden',
          },
        ]}
      />
    </View>
  );
}

function getUserHeaderColor(isDark) {
  return isDark ? USER_HEADER_DARK : USER_HEADER_LIGHT;
}

function getUserHeaderUnderlayColor(routeName, isDark, fallback) {
  if (isIntegratedHeaderRoute(routeName)) {
    return isDark ? '#07111F' : '#E9EFE8';
  }
  return fallback;
}

function getUserHeaderTint(isDark) {
  return isDark ? '#fff' : USER_NAVY;
}

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

function AnimatedTabBarIcon({ iconName, focused, color, activeColor, size, activeBg }) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const fillScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <Animated.View style={{ width: 46, height: 42, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 46,
          height: 42,
          borderRadius: 16,
          backgroundColor: activeBg,
          opacity: progress,
          transform: [{ scale: fillScale }],
        }}
      />
      <MaterialIcons
        name={iconName}
        size={focused ? size + 2 : size}
        color={focused ? activeColor : color}
      />
    </Animated.View>
  );
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
  const { theme, isDark } = useTheme();
  const themeColors = theme.colors;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => {
        const headerColor = getUserHeaderColor(isDark);
        // For Home, underlay is transparent and content extends under the header,
        // so the curve's corner cutouts reveal whatever sits at the top of the
        // screen content (hero when scrolled to top, screenBg when scrolled past).
        const isHome = route.name === 'Home';
        const headerUnderlay = isHome
          ? 'transparent'
          : getUserHeaderUnderlayColor(route.name, isDark, themeColors.background);
        const headerTint = getUserHeaderTint(isDark);

        return {
        headerShown: true,
        // On Home, screen content extends under the header so the carved corners
        // of the rounded header background reveal the hero/screen below it.
        headerTransparent: isHome,
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerBackground: () => (
          <RoundedHeaderBackground
            color={headerColor}
            underlayColor={headerUnderlay}
          />
        ),
        headerShadowVisible: false,
        headerTintColor: headerTint,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: headerTint,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: Platform.OS === 'ios' ? 24 : 18,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: isDark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.96)',
          borderTopWidth: 0,
          borderRadius: 24,
          elevation: 18,
          shadowColor: USER_NAVY,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.35 : 0.16,
          shadowRadius: 20,
        },
        tabBarItemStyle: {
          height: 48,
        },
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        headerRight: () => <NotificationBell color={headerTint} />,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Booking') iconName = 'event-note';
          else if (route.name === 'Profile') iconName = 'account-circle';
          else if (route.name === 'Events') iconName = 'event';
          else if (route.name === 'Settings') iconName = 'settings';
          return (
            <AnimatedTabBarIcon
              iconName={iconName}
              focused={focused}
              color={color}
              activeColor={themeColors.primary}
              size={size}
              activeBg={`${themeColors.primary}18`}
            />
          );
        },
        animationEnabled: true,
        };
      }}
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
  const { theme, isDark } = useTheme();
  const themeColors = theme.colors;
  const userStackHeaderColor = getUserHeaderColor(isDark);
  const userStackHeaderTint = getUserHeaderTint(isDark);
  const userStackHeaderOptions = {
    headerTitleAlign: 'center',
    headerStyle: {
      backgroundColor: 'transparent',
      elevation: 0,
      shadowOpacity: 0,
    },
    headerBackground: () => (
      <RoundedHeaderBackground
        color={userStackHeaderColor}
        underlayColor={themeColors.background}
      />
    ),
    headerShadowVisible: false,
    headerTintColor: userStackHeaderTint,
    headerTitleStyle: {
      fontWeight: '700',
      fontSize: 16,
      color: userStackHeaderTint,
    },
  };
  
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
          ...userStackHeaderOptions,
          headerShown: true,
          headerTitle: 'Оформление покупки',
        }}
      />
      <Stack.Screen
        name="CardTopUp"
        component={CardTopUpScreen}
        options={{
          ...userStackHeaderOptions,
          headerShown: true,
          headerTitle: 'Пополнить баланс',
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          ...userStackHeaderOptions,
          headerShown: true,
          headerTitle: 'Профиль',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="AuctionDetail"
        component={AuctionDetailScreen}
        options={{
          ...userStackHeaderOptions,
          headerShown: true,
          headerTitle: 'Аукцион',
        }}
      />
      <Stack.Screen
        name="MyBids"
        component={MyBidsScreen}
        options={{
          ...userStackHeaderOptions,
          headerShown: true,
          headerTitle: 'Мои ставки',
        }}
      />
    </Stack.Navigator>
  );
}

// Admin Navigation
function AdminTabs() {
  const { theme, isDark } = useTheme();
  const themeColors = theme.colors;

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => {
        const headerColor = getUserHeaderColor(isDark);
        const headerTint  = getUserHeaderTint(isDark);
        const headerUnderlay = themeColors.background;

        return {
        headerShown: true,
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerBackground: () => (
          <RoundedHeaderBackground
            color={headerColor}
            underlayColor={headerUnderlay}
          />
        ),
        headerShadowVisible: false,
        headerTintColor: headerTint,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: headerTint,
        },
        headerRight: () => <NotificationBell color={headerTint} />,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: Platform.OS === 'ios' ? 24 : 18,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: isDark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.96)',
          borderTopWidth: 0,
          borderRadius: 24,
          elevation: 18,
          shadowColor: USER_NAVY,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.35 : 0.16,
          shadowRadius: 20,
        },
        tabBarItemStyle: {
          height: 48,
        },
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'dashboard';
          if (route.name === 'Dashboard') iconName = 'dashboard';
          else if (route.name === 'AdminEvents') iconName = 'event-note';
          else if (route.name === 'AdminUsers') iconName = 'people';
          else if (route.name === 'AdminFinance') iconName = 'attach-money';
          else if (route.name === 'AdminStats') iconName = 'bar-chart';
          else if (route.name === 'AdminSettings') iconName = 'settings';
          return (
            <AnimatedTabBarIcon
              iconName={iconName}
              focused={focused}
              color={color}
              activeColor={themeColors.primary}
              size={size}
              activeBg={`${themeColors.primary}18`}
            />
          );
        },
        animationEnabled: true,
        };
      }}
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
      <Stack.Screen
        name="AdminChurnRisk"
        component={AdminChurnRisk}
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
    <AppProviders>
      <NavigationContainerWrapper />
    </AppProviders>
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
    if (!isLoading && isLoggedIn) {
      preloadBookingImages();
    }

    if (!isLoading && isLoggedIn && !prevIsLoggedIn.current) {
      Keyboard.dismiss();
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
  const statusBarColor = isLoggedIn && !isAdmin
    ? getUserHeaderColor(isDark)
    : (isDark ? theme.colors.background : theme.colors.primary);

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={statusBarColor}
        translucent={Platform.OS === 'android'}
      />
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
      <OfflineBanner />
      {showTransition && (
        <LoginTransitionOverlay
          type={transitionType}
          onComplete={() => setShowTransition(false)}
        />
      )}
    </>
  );
}
