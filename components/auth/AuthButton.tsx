import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

type Variant = 'primary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function AuthButton({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
}: Props) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? Colors.surface : Colors.navy} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primary: {
    backgroundColor: Colors.navy,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
  },
  labelPrimary: {
    color: Colors.textOnDark,
  },
  labelGhost: {
    color: Colors.navy,
  },
});
