import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  Landmark,
  Coins,
} from 'lucide-react-native';

export default function MobileAdjustBalanceScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<'business' | 'personal' | 'family'>('business');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('Physical Drawer Tally Rebalance');

  const currentBalancePaise = 4192000; // ₹41,920.00
  const inputAmtPaise = Math.round((parseFloat(amountStr) || 0) * 100);
  const newBalancePaise =
    direction === 'increase'
      ? currentBalancePaise + inputAmtPaise
      : Math.max(0, currentBalancePaise - inputAmtPaise);

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const handleConfirm = () => {
    if (inputAmtPaise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an adjustment amount greater than ₹0.00');
      return;
    }
    Alert.alert(
      'Adjustment Confirmed',
      `Adjusted balance to ${formatRupees(newBalancePaise)} successfully under ${scope.toUpperCase()} category.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Scope Segmented Switcher */}
      <Text style={styles.sectionLabel}>1. Category Sphere (Strict Separation)</Text>
      <View style={styles.sphereContainer}>
        {(['business', 'personal', 'family'] as const).map((s) => {
          const isActive = scope === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setScope(s)}
              style={[styles.spherePill, isActive && styles.spherePillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.sphereText, isActive && styles.sphereTextActive]}>
                {s === 'business' ? '🏢 Business' : s === 'personal' ? '👤 Personal' : '👨‍👩‍👧 Family'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Account Info Card */}
      <View style={styles.accountCard}>
        <View style={styles.accountIconBox}>
          <Coins size={20} color="#B45309" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.accountName}>Counter Drawer 01</Text>
          <Text style={styles.accountType}>PHYSICAL CASH DRAWER • {scope.toUpperCase()}</Text>
        </View>
        <Text style={styles.accountBal}>{formatRupees(currentBalancePaise)}</Text>
      </View>

      {/* Direction Switcher */}
      <Text style={styles.sectionLabel}>2. Adjustment Direction</Text>
      <View style={styles.directionRow}>
        <TouchableOpacity
          onPress={() => setDirection('increase')}
          style={[styles.dirBtn, direction === 'increase' && styles.dirBtnActiveCredit]}
          activeOpacity={0.8}
        >
          <ArrowDownLeft
            size={18}
            color={direction === 'increase' ? '#FFFFFF' : '#059669'}
          />
          <Text
            style={[
              styles.dirBtnText,
              direction === 'increase' && styles.dirBtnTextActive,
            ]}
          >
            + Add (Credit)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDirection('decrease')}
          style={[styles.dirBtn, direction === 'decrease' && styles.dirBtnActiveDebit]}
          activeOpacity={0.8}
        >
          <ArrowUpRight
            size={18}
            color={direction === 'decrease' ? '#FFFFFF' : '#E11D48'}
          />
          <Text
            style={[
              styles.dirBtnText,
              direction === 'decrease' && styles.dirBtnTextActive,
            ]}
          >
            − Deduct (Debit)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input */}
      <Text style={styles.sectionLabel}>3. Adjustment Amount (₹)</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.currencyPrefix}>₹</Text>
        <TextInput
          style={styles.amountInput}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor="#94A3B8"
          value={amountStr}
          onChangeText={setAmountStr}
        />
      </View>

      {/* Presets */}
      <View style={styles.presetRow}>
        {[500, 1000, 2000, 5000].map((amt) => (
          <TouchableOpacity
            key={amt}
            onPress={() => setAmountStr(amt.toString())}
            style={styles.presetChip}
            activeOpacity={0.7}
          >
            <Text style={styles.presetText}>+₹{amt.toLocaleString('en-IN')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transformation Preview Card */}
      <View style={styles.previewCard}>
        <Text style={styles.previewHeading}>TRANSFORMATION PREVIEW</Text>
        <View style={styles.previewGrid}>
          <View>
            <Text style={styles.prevSub}>Current</Text>
            <Text style={styles.prevVal}>{formatRupees(currentBalancePaise)}</Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.prevSub}>Adjustment</Text>
            <Text
              style={[
                styles.prevVal,
                direction === 'increase' ? styles.creditText : styles.debitText,
              ]}
            >
              {direction === 'increase' ? '+' : '−'}
              {formatRupees(inputAmtPaise)}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.prevSub}>Projected</Text>
            <Text style={[styles.prevVal, styles.projectedVal]}>
              {formatRupees(newBalancePaise)}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Check size={18} color="#0F172A" />
          <Text style={styles.confirmText}>Confirm Adjustment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  sphereContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.1)',
  },
  spherePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 14,
  },
  spherePillActive: {
    backgroundColor: '#F59E0B',
  },
  sphereText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  sphereTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.12)',
    gap: 12,
  },
  accountIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  accountType: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 2,
  },
  accountBal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  directionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dirBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.12)',
    gap: 6,
  },
  dirBtnActiveCredit: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  dirBtnActiveDebit: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  dirBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  dirBtnTextActive: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.15)',
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F59E0B',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    height: 52,
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.1)',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.15)',
  },
  previewHeading: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
  },
  previewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prevSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 2,
  },
  prevVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  creditText: {
    color: '#059669',
    fontWeight: '900',
  },
  debitText: {
    color: '#E11D48',
    fontWeight: '900',
  },
  projectedVal: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.15)',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
});
