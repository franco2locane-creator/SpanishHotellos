import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography } from '@/lib/theme';

type Props = {
  title: string;
  /** AsyncStorage key this section's expanded state is persisted under —
   *  convention: `@sp4h_progress_section_<name>`. */
  storageKey: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

export default function CollapsibleSection({ title, storageKey, defaultExpanded = false, children }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey).then(v => {
      if (!cancelled && v !== null) setExpanded(v === '1');
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    AsyncStorage.setItem(storageKey, next ? '1' : '0');
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${expanded ? 'expanded' : 'collapsed'}`}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.sm },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  chevron: { fontSize: Typography.body, color: Colors.textMuted, fontWeight: '700' },
  body: { marginTop: Spacing.xs },
});
