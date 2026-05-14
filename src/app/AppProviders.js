import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './ErrorBoundary';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { NetworkProvider } from '../context/NetworkContext';
import { UserDataProvider } from '../context/UserDataContext';
import { EventProvider } from '../context/EventContext';
import { NotificationProvider } from '../context/NotificationContext';
import { AnalyticsProvider } from '../context/AnalyticsContext';
import { BookingProvider } from '../context/BookingContext';
import { ReferralProvider } from '../context/ReferralContext';
import { PaymentProvider } from '../context/PaymentContext';

export default function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NetworkProvider>
          <AuthProvider>
            <UserDataProvider>
              <EventProvider>
                <NotificationProvider>
                  <AnalyticsProvider>
                    <BookingProvider>
                      <ReferralProvider>
                        <PaymentProvider>
                          {children}
                        </PaymentProvider>
                      </ReferralProvider>
                    </BookingProvider>
                  </AnalyticsProvider>
                </NotificationProvider>
              </EventProvider>
            </UserDataProvider>
          </AuthProvider>
          </NetworkProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
