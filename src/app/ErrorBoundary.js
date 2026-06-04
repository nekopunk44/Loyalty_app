import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as Sentry from '@sentry/react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;

    return (
      <View style={styles.container}>
        <MaterialIcons name="error-outline" size={64} color="#E53E3E" />
        <Text style={styles.title}>Что-то пошло не так</Text>
        <Text style={styles.subtitle}>
          Произошла непредвиденная ошибка. Попробуйте перезапустить экран.
        </Text>

        {error && (
          <ScrollView style={styles.devBox} contentContainerStyle={styles.devBoxContent}>
            <Text style={styles.devText}>{error.toString()}</Text>
            {error.stack && (
              <Text style={[styles.devText, { marginTop: 8, fontSize: 10 }]}>
                {String(error.stack).split('\n').slice(0, 8).join('\n')}
              </Text>
            )}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.buttonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F7FAFC',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  devBox: {
    maxHeight: 280,
    width: '100%',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    marginBottom: 24,
  },
  devBoxContent: {
    padding: 12,
  },
  devText: {
    fontSize: 12,
    color: '#C53030',
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1150',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
