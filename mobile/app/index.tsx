import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Coins,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { supabase } from '../src/lib/supabase';

export default function MobileDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [balancePaise, setBalancePaise] = useState(4192000); // ₹41,920.00
  const [receivablesPaise, setReceivablesPaise] = useState(1504200); // ₹15,042.00
  const [activeScope, setActiveScope] = useState<'business' | 'personal' | 'family'>('business');

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('cash_locations')
        .select('*')
        .eq('scope', activeScope);
      if (data && data.length > 0) {
        const total = data.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
        setBalancePaise(total);
      }
    } catch (e) {
      // fallback to mock
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>RECORDBOOK • CREXTIO</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>

        <TouchableOpacity
          style={styles.adjustPill}
          onPress={() => router.push('/adjust')}
          activeOpacity={0.8}
        >
          <SlidersHorizontal size={14} color="#0F172A" />
          <Text style={styles.adjustText}>Adjust</Text>
        </TouchableOpacity>
      </View>

      {/* Sphere Segmented Pills */}
      <View style={styles.sphereContainer}>
        {(['business', 'personal', 'family'] as const).map((s) => {
          const isActive = activeScope === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveScope(s)}
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

      {/* Main Glassmorphic Hero Card */}
      <View style={styles.glassCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Wallet size={20} color="#B45309" />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ACTIVE DRAWER</Text>
          </View>
        </View>

        <Text style={styles.balanceLabel}>Liquid Available Balance</Text>
        <Text style={styles.balanceValue}>{formatRupees(balancePaise)}</Text>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.inflowBtn} activeOpacity={0.85}>
            <ArrowDownLeft size={16} color="#FFFFFF" />
            <Text style={styles.btnText}>+ Inflow</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outflowBtn} activeOpacity={0.85}>
            <ArrowUpRight size={16} color="#FFFFFF" />
            <Text style={styles.btnText}>− Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2-Column KPI Strip */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Users size={16} color="#6366F1" />
            <Text style={styles.kpiLabel}>Khata Udhar</Text>
          </View>
          <Text style={styles.kpiVal}>{formatRupees(receivablesPaise)}</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <TrendingUp size={16} color="#10B981" />
            <Text style={styles.kpiLabel}>Weekly Velocity</Text>
          </View>
          <Text style={styles.kpiVal}>+₹85,420</Text>
        </View>
      </View>

      {/* Drawer Directory Shortcut */}
      <TouchableOpacity
        style={styles.directoryCard}
        onPress={() => router.push('/cash')}
        activeOpacity={0.8}
      >
        <View style={styles.dirLeft}>
          <Coins size={22} color="#D97706" />
          <View style={styles.dirTexts}>
            <Text style={styles.dirTitle}>Cash Drawer &amp; Galla Tally</Text>
            <Text style={styles.dirSub}>Multi-counter reconciliation &amp; transfers</Text>
          </View>
        </View>
        <Text style={styles.arrowText}>→</Text>
      </TouchableOpacity>
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
    paddingTop: 54,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  adjustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  adjustText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  sphereContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
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
  glassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.8,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 18,
    fontVariant: ['tabular-nums'],
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inflowBtn: {
    flex: 1,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  outflowBtn: {
    flex: 1,
    backgroundColor: '#E11D48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.08)',
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  kpiVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  directoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.1)',
  },
  dirLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dirTexts: {
    gap: 2,
  },
  dirTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  dirSub: {
    fontSize: 11,
    color: '#64748B',
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D97706',
  },
});
