import React from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export default class FadeView extends React.Component {
  state = {
    fadeAnim: new Animated.Value(0),
  };

  componentDidMount() {
    const useNative = typeof window === 'undefined'; // false на web
    Animated.timing(this.state.fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: useNative,
    }).start();
  }

  render() {
    const { fadeAnim } = this.state;
    return (
      <Animated.View style={{ ...this.props.style, opacity: fadeAnim }}>
        {this.props.children}
      </Animated.View>
    );
  }
}
