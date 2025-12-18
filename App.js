import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from './src/constants/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { BookingProvider } from './src/context/BookingContext';
import { ReferralProvider } from './src/context/ReferralContext';
import { PaymentProvider } from './src/context/PaymentContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AnalyticsProvider } from './src/context/AnalyticsContext';
import { ReviewProvider } from './src/context/ReviewContext';
import { EventProvider } from './src/context/EventContext';
import { UserDataProvider } from './src/context/UserDataContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookingScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import MyCardScreen from './src/screens/MyCardScreen';
import CardTopUpScreen from './src/screens/CardTopUpScreen';
import EventsScreen from './src/screens/EventsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SplashScreen from './src/screens/SplashScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import AdminFinanceDashboard from './src/screens/AdminFinanceDashboard';
import AdminEvents from './src/screens/AdminEvents';
import AdminStats from './src/screens/AdminStats';
import AdminUsers from './src/screens/AdminUsers';
import NotificationCenter from './src/screens/NotificationCenter';
import PropertyReviewsScreen from './src/screens/PropertyReviewsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
          paddingBottom: 5,
          height: 60,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        tabBarShowLabel: false,
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
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Главная' }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Забронировать' }}
      />
      <Tab.Screen
        name="Profile"
        component={MyCardScreen}
        options={{ title: 'Моя карта' }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ title: 'События' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Настройки' }}
      />
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
        name="PropertyReviews"
        component={PropertyReviewsScreen}
        options={{
          headerShown: false,
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
          paddingBottom: 5,
          height: 60,
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
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{ title: 'Панель администратора' }}
      />
      <Tab.Screen
        name="AdminEvents"
        component={AdminEvents}
        options={{ title: 'События' }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsers}
        options={{ title: 'Пользователи' }}
      />
      <Tab.Screen
        name="AdminFinance"
        component={AdminFinanceDashboard}
        options={{ title: 'Финансы' }}
      />
      <Tab.Screen
        name="AdminStats"
        component={AdminStats}
        options={{ title: 'Статистика' }}
      />
      <Tab.Screen
        name="AdminSettings"
        component={SettingsScreen}
        options={{ title: 'Настройки' }}
      />
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
        cardStyle: { backgroundColor: themeColors.background },
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
const DEBUG_MODE = true; // Установите в true для отладки

function RootNavigator() {
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const { theme } = useTheme();

  if (DEBUG_MODE) console.log('🔄 RootNavigator render:', { isLoggedIn, isAdmin, isLoading });

  if (isLoading) {
    if (DEBUG_MODE) console.log('⏳ Показываю LoadingScreen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (DEBUG_MODE) console.log('✅ isLoading = false, показываю навигацию');

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        cardStyle: { backgroundColor: theme.colors.background },
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
              animationEnabled: true,
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

export default function App() {
  useEffect(() => {
    if (DEBUG_MODE) console.log('📱 App монтирован');
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <UserDataProvider>
          <EventProvider>
            <NotificationProvider>
              <AnalyticsProvider>
                <BookingProvider>
                  <ReferralProvider>
                    <PaymentProvider>
                      <ReviewProvider>
                        <NavigationContainerWrapper />
                      </ReviewProvider>
                    </PaymentProvider>
                  </ReferralProvider>
                </BookingProvider>
              </AnalyticsProvider>
            </NotificationProvider>
          </EventProvider>
        </UserDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Компонент для применения темы к NavigationContainer
function NavigationContainerWrapper() {
  const { isDark, theme, isThemeLoaded } = useTheme();
  const { isLoading } = useAuth();

  // Не показываем ничего, пока тема не загружена и приложение инициализируется
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
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
