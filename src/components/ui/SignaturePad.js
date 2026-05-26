import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function SignaturePad({
  value = [],
  onChange,
  color = '#063B5C',
  backgroundColor = '#FFFFFF',
  borderColor = '#E2E8F0',
  strokeWidth = 2.4,
  height = 170,
  placeholder = 'Распишитесь пальцем',
  clearLabel = 'Очистить',
}) {
  const [paths, setPaths] = useState(value);
  const [currentPath, setCurrentPath] = useState('');
  const currentPathRef = useRef('');
  currentPathRef.current = currentPath;

  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  const commit = (next) => {
    setPaths(next);
    onChange?.(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(`M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(prev => `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        const drawn = currentPathRef.current;
        if (drawn && drawn.length > 4) {
          commit([...pathsRef.current, drawn]);
        }
        setCurrentPath('');
      },
      onPanResponderTerminate: () => setCurrentPath(''),
    })
  ).current;

  const clear = () => {
    setCurrentPath('');
    commit([]);
  };

  const isEmpty = paths.length === 0 && !currentPath;

  return (
    <View>
      <View
        {...panResponder.panHandlers}
        style={[styles.pad, { height, backgroundColor, borderColor }]}
      >
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
        {isEmpty && (
          <View pointerEvents="none" style={styles.placeholderWrap}>
            <MaterialIcons name="draw" size={20} color="#94A3B8" />
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={clear} style={styles.clearBtn} activeOpacity={0.7}>
        <MaterialIcons name="refresh" size={15} color="#64748B" />
        <Text style={styles.clearText}>{clearLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  placeholderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic' },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  clearText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
});
