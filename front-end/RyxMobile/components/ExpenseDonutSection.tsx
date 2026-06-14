import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { ExpenseItem } from '../services/expenses';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';

export const DONUT_SEGMENT_COLORS = [
  '#3b82f6',
  '#eab308',
  '#14b8a6',
  '#ec4899',
  '#8b5cf6',
  '#f97316',
  '#22c55e',
  '#64748b',
] as const;

export type ExpenseDonutSegment = {
  categoryId: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  total: number;
  count: number;
  color: string;
  items: ExpenseItem[];
};

type DonutLayout = {
  chartSize: number;
  R: number;
  STROKE: number;
  CX: number;
  CY: number;
  badge: number;
  ringIconGlyph: number;
  /** Diamètre intérieur du trou − marge : le texte ne doit pas dépasser l’anneau. */
  centerTextMaxW: number;
};

function getLayout(compact: boolean): DonutLayout {
  if (compact) {
    const R = 54;
    const STROKE = 16;
    return {
      chartSize: 168,
      R,
      STROKE,
      CX: 84,
      CY: 84,
      badge: 22,
      ringIconGlyph: 11,
      centerTextMaxW: Math.max(56, 2 * R - STROKE - 12),
    };
  }
  const R = 78;
  const STROKE = 22;
  return {
    chartSize: 240,
    R,
    STROKE,
    CX: 120,
    CY: 120,
    badge: 28,
    ringIconGlyph: 14,
    centerTextMaxW: Math.max(80, 2 * R - STROKE - 16),
  };
}

const MIN_FRAC_FOR_ICON = 0.07;

type Props = {
  segments: ExpenseDonutSegment[];
  grandTotal: number;
  formatAmount: (n: number) => string;
  formatListDate: (raw: string) => string;
  categoryItemsExpanded: Record<string, boolean>;
  onToggleCategory: (categoryId: string) => void;
  /** Donut plus petit (ex. deux colonnes sur l’accueil) */
  compact?: boolean;
  /** Sorties vs entrées : libellé central, icônes et couleurs des lignes détaillées */
  flow?: 'out' | 'in';
  onItemLongPress?: (item: ExpenseItem, flow: 'out' | 'in') => void;
};

export function ExpenseDonutSection({
  segments,
  grandTotal,
  formatAmount,
  formatListDate,
  categoryItemsExpanded,
  onToggleCategory,
  compact = false,
  flow = 'out',
  onItemLongPress,
}: Props) {
  const { ui, colors, spacing, radius, fontSize, isDark } = useAppTheme();
  const { t } = useTranslation();
  const layout = useMemo(() => getLayout(compact), [compact]);

  const styles = useMemo(
    () => makeStyles(ui, colors, spacing, radius, fontSize, isDark, compact),
    [ui, colors, spacing, radius, fontSize, isDark, compact]
  );

  const C = 2 * Math.PI * layout.R;
  const { CX, CY, R, STROKE, chartSize, badge, ringIconGlyph, centerTextMaxW } = layout;

  const iconPlacements = useMemo(() => {
    if (grandTotal <= 0) {
      return [] as {
        key: string;
        left: number;
        top: number;
        icon: keyof typeof Ionicons.glyphMap;
        color: string;
      }[];
    }
    const out: {
      key: string;
      left: number;
      top: number;
      icon: keyof typeof Ionicons.glyphMap;
      color: string;
    }[] = [];
    let angleRad = -Math.PI / 2;
    const half = badge / 2;
    for (const seg of segments) {
      const frac = seg.total / grandTotal;
      if (frac >= MIN_FRAC_FOR_ICON) {
        const mid = angleRad + Math.PI * frac;
        const x = CX + R * Math.cos(mid) - half;
        const y = CY + R * Math.sin(mid) - half;
        out.push({ key: seg.categoryId, left: x, top: y, icon: seg.icon, color: seg.color });
      }
      angleRad += 2 * Math.PI * frac;
    }
    return out;
  }, [segments, grandTotal, CX, CY, R, badge]);

  const centerSubtitleKey = flow === 'in' ? 'accueil.chartInflows' : 'depenses.chartOutflows';
  const rowGlyph = compact ? 15 : 18;
  const chevronSize = compact ? 16 : 18;
  const nestedGlyph = compact ? 17 : 20;
  const nestedArrowName = flow === 'in' ? 'arrow-up-circle' : 'arrow-down-circle';
  const nestedArrowColor = flow === 'in' ? '#059669' : '#dc2626';

  return (
    <View style={styles.shell}>
      <View style={[styles.chartWrap, { width: chartSize, height: chartSize }]}>
        <Svg width={chartSize} height={chartSize}>
          {grandTotal > 0 ? (
            (() => {
              let rot = -90;
              return segments.map((seg) => {
                const frac = seg.total / grandTotal;
                const dashLen = frac * C;
                const node = (
                  <Circle
                    key={seg.categoryId}
                    cx={CX}
                    cy={CY}
                    r={R}
                    stroke={seg.color}
                    strokeWidth={STROKE}
                    fill="none"
                    strokeDasharray={`${dashLen} ${C}`}
                    strokeLinecap="butt"
                    transform={`rotate(${rot} ${CX} ${CY})`}
                  />
                );
                rot += frac * 360;
                return node;
              });
            })()
          ) : (
            <Circle cx={CX} cy={CY} r={R} stroke={ui.border} strokeWidth={STROKE} fill="none" opacity={0.45} />
          )}
        </Svg>
        {iconPlacements.map((p) => (
          <View
            key={p.key}
            style={[
              styles.ringIconBadge,
              {
                left: p.left,
                top: p.top,
                width: badge,
                height: badge,
                borderRadius: badge / 2,
              },
            ]}
          >
            <Ionicons name={p.icon} size={ringIconGlyph} color={p.color} />
          </View>
        ))}
        <View style={styles.centerLabelsOuter} pointerEvents="none">
          <View style={[styles.centerLabelsInner, { width: centerTextMaxW, maxWidth: centerTextMaxW }]}>
            <Text
              style={styles.centerAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              allowFontScaling
            >
              {formatAmount(grandTotal)}
            </Text>
            <Text
              style={styles.centerSubtitle}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              allowFontScaling
            >
              {t(centerSubtitleKey)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.list}>
        {segments.map((seg, index) => {
          const expanded = !!categoryItemsExpanded[seg.categoryId];
          const pct =
            grandTotal > 0 ? Math.min(100, Math.max(0, Math.round((seg.total / grandTotal) * 100))) : 0;
          const meta =
            seg.count === 1
              ? t('depenses.chartLineSubOne', { pct })
              : t('depenses.chartLineSubMany', { pct, count: seg.count });
          return (
            <View key={seg.categoryId}>
              <Pressable
                style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.rowPressed]}
                onPress={() => onToggleCategory(seg.categoryId)}
              >
                <View style={[styles.rowIcon, { backgroundColor: seg.color }]}>
                  <Ionicons name={seg.icon} size={rowGlyph} color={colors.white} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {t(seg.labelKey)}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {meta}
                  </Text>
                </View>
                <View style={styles.rowAmountWrap}>
                  <Text
                    style={styles.rowAmount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    allowFontScaling
                  >
                    {formatAmount(seg.total)}
                  </Text>
                </View>
                <View style={styles.rowChevron}>
                  <Ionicons
                    name={expanded ? 'chevron-down' : 'chevron-forward'}
                    size={chevronSize}
                    color={ui.textTertiary}
                  />
                </View>
              </Pressable>
              {expanded
                ? seg.items.map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.nestedCard, pressed && styles.nestedCardPressed]}
                      onLongPress={() => onItemLongPress?.(item, flow)}
                    >
                      <View style={[styles.nestedIconWrap, flow === 'in' ? styles.nestedIconWrapIn : styles.nestedIconWrapOut]}>
                        <Ionicons name={nestedArrowName} size={nestedGlyph} color={nestedArrowColor} />
                      </View>
                      <View style={styles.nestedBody}>
                        <Text style={styles.nestedTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {item.desc ? (
                          <Text style={styles.nestedDesc} numberOfLines={1}>
                            {item.desc}
                          </Text>
                        ) : null}
                        <Text style={styles.nestedDate}>{formatListDate(item.date)}</Text>
                      </View>
                      <View style={styles.nestedAmountWrap}>
                        <Text
                          style={[styles.nestedAmount, flow === 'in' ? styles.nestedAmountIn : styles.nestedAmountOut]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.72}
                          allowFontScaling
                        >
                          {item.amount}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(
  ui: ReturnType<typeof useAppTheme>['ui'],
  colors: ReturnType<typeof useAppTheme>['colors'],
  spacing: ReturnType<typeof useAppTheme>['spacing'],
  radius: ReturnType<typeof useAppTheme>['radius'],
  fontSize: ReturnType<typeof useAppTheme>['fontSize'],
  isDark: boolean,
  compact: boolean
) {
  return StyleSheet.create({
    shell: {
      borderRadius: compact ? radius.lg : radius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: ui.donutShellBorder,
      backgroundColor: ui.donutShellBg,
      ...Platform.select({
        ios: {
          shadowColor: isDark ? '#000' : '#ffffff',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.35,
          shadowRadius: compact ? 8 : 14,
        },
        android: {},
      }),
    },
    chartWrap: {
      alignSelf: 'center',
      marginTop: compact ? spacing[2] : spacing[4],
      marginBottom: compact ? spacing[1] : spacing[2],
    },
    ringIconBadge: {
      position: 'absolute',
      backgroundColor: ui.ringBadgeBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.06)',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
        },
        android: { elevation: 2 },
      }),
    },
    centerLabelsOuter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerLabelsInner: {
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerAmount: {
      width: '100%',
      fontSize: compact ? 15 : 20,
      fontWeight: '800',
      color: ui.textTitle,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    centerSubtitle: {
      marginTop: compact ? 2 : 4,
      width: '100%',
      fontSize: compact ? 8 : 10,
      fontWeight: '700',
      color: ui.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: compact ? 0.25 : 0.8,
      textAlign: 'center',
    },
    list: {
      paddingHorizontal: compact ? spacing[2] : spacing[3],
      paddingBottom: compact ? spacing[2] : spacing[3],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: compact ? spacing[2] : spacing[3],
      paddingHorizontal: compact ? spacing[1] : spacing[2],
      gap: compact ? spacing[2] : spacing[3],
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)',
    },
    rowPressed: { opacity: 0.88 },
    rowIcon: {
      flexShrink: 0,
      width: compact ? 32 : 40,
      height: compact ? 32 : 40,
      borderRadius: compact ? 16 : 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTextWrap: { flex: 1, minWidth: 0 },
    rowTitle: {
      fontSize: compact ? fontSize.sm : fontSize.base,
      fontWeight: '600',
      color: ui.textTitle,
    },
    rowMeta: { marginTop: 2, fontSize: compact ? 10 : fontSize.xs, color: ui.textTertiary },
    rowAmountWrap: {
      flexShrink: 1,
      minWidth: 0,
      maxWidth: compact ? '54%' : 180,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    rowAmount: {
      width: '100%',
      fontSize: compact ? fontSize.sm : fontSize.base,
      fontWeight: '700',
      color: ui.textTitle,
      textAlign: 'right',
    },
    rowChevron: { flexShrink: 0 },
    nestedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: compact ? spacing[1] : spacing[2],
      marginRight: compact ? spacing[1] : spacing[2],
      marginBottom: spacing[2],
      padding: compact ? spacing[2] : spacing[3],
      borderRadius: radius.lg,
      backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.55)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)',
    },
    nestedCardPressed: { opacity: 0.92 },
    nestedIconWrap: {
      width: compact ? 32 : 40,
      height: compact ? 32 : 40,
      borderRadius: compact ? 10 : 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: compact ? spacing[2] : spacing[3],
    },
    nestedIconWrapOut: {
      backgroundColor: 'rgba(220,38,38,0.08)',
    },
    nestedIconWrapIn: {
      backgroundColor: 'rgba(5,150,105,0.1)',
    },
    nestedBody: { flex: 1, minWidth: 0 },
    nestedAmountWrap: {
      flexShrink: 1,
      minWidth: 0,
      maxWidth: compact ? '42%' : 140,
      alignItems: 'flex-end',
    },
    nestedTitle: {
      fontSize: compact ? fontSize.xs : fontSize.sm,
      fontWeight: '600',
      color: ui.textTitle,
    },
    nestedDesc: { fontSize: fontSize.xs, color: ui.textSecondary, marginTop: 2 },
    nestedDate: { fontSize: 10, color: ui.textTertiary, marginTop: 4 },
    nestedAmount: {
      width: '100%',
      fontSize: compact ? fontSize.xs : fontSize.sm,
      fontWeight: '700',
      textAlign: 'right',
    },
    nestedAmountOut: { color: '#dc2626' },
    nestedAmountIn: { color: '#059669' },
  });
}
