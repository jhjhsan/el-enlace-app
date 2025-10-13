// components/BackButton.js
import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IOS_BACK_BUTTON_CONFIG as C } from './backButtonConfig';

/**
 * ANDROID: conserva props top/left/size/color exactamente como las usas hoy.
 * iOS: usa la config global (tamaño y posición iguales en todas las pantallas).
 */
export default function BackButton({
  color = '#fff',
  size = 28,
  top = 15,
  left = 20,
  onPress,
  style,
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'ios') {
    const iconSize = C.ICON_SIZE;
    const bubbleSize = iconSize + C.BUBBLE_PADDING * 2;

    return (
      <TouchableOpacity
        onPress={onPress || (() => navigation.goBack())}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[
          stylesIOS.bubble,
          {
            top: insets.top + C.TOP_OFFSET,
            left: C.LEFT_OFFSET,
            width: bubbleSize,
            height: bubbleSize,
            borderRadius: bubbleSize / 2,
            backgroundColor: C.BACKGROUND,
            borderWidth: C.BORDER_WIDTH,
            borderColor: C.BORDER_COLOR ?? 'transparent',
          },
          C.SHADOW && stylesIOS.shadow,
          style,
        ]}
      >
        <Ionicons name="chevron-back" size={iconSize} color="#fff" />
      </TouchableOpacity>
    );
  }

  // ANDROID (sin cambios)
  return (
    <TouchableOpacity
      onPress={onPress || (() => navigation.goBack())}
      style={[stylesAndroid.button, { top, left }, style]}
      activeOpacity={0.8}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="arrow-back" size={size} color={color} />
    </TouchableOpacity>
  );
}

const stylesAndroid = StyleSheet.create({
  button: {
    position: 'absolute',
    zIndex: 10,
  },
});

const stylesIOS = StyleSheet.create({
  bubble: {
    position: 'absolute',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});
