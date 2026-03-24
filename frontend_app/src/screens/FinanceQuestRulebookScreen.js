import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import {
  BookOpen, Zap, Flame, Shield, Heart, Trophy, Star,
  Award, Target, Calendar, TrendingUp
} from 'lucide-react-native';

// Design Tokens (MANDATORY)
const TOKENS = {
  Primary: '#1E6BD6',
  PrimaryLight: '#4C8DF0',
  PrimaryDark: '#154EA1',
  Background: '#FFFFFF',
  Surface: '#F5F7FA',
  TextPrimary: '#0D1B2A',
  TextSecondary: '#44556B',
  Borders: '#E0E6EE',
};

// Section Content Colors mapped for Mobile clarity
const SECTIONS_COLORS = {
  amber: { bg: '#fffbeb', text: '#d97706', border: '#fef3c7' },
  purple: { bg: '#f3e8ff', text: '#9333ea', border: '#e9d5ff' },
  orange: { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' },
  blue: { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe' },
  emerald: { bg: '#ecfdf5', text: '#059669', border: '#d1fae5' },
  indigo: { bg: '#eef2ff', text: '#4f46e5', border: '#e0e7ff' },
};

const SectionData = ({ icon: Icon, title, colorKey, children }) => {
  const theme = SECTIONS_COLORS[colorKey] || SECTIONS_COLORS.indigo;
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconBox, { backgroundColor: theme.bg }]}>
          <Icon size={20} color={theme.text} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>
        {children}
      </View>
    </View>
  );
};

const RuleRow = ({ emoji, label, value, highlight = false }) => (
  <View style={styles.ruleRow}>
    <Text style={[styles.ruleEmoji, highlight ? { opacity: 1 } : { opacity: 0.6 }]}>{emoji}</Text>
    <View style={styles.ruleContent}>
      <Text style={styles.ruleLabel}>{label}</Text>
      {!!value && (
        <Text style={[styles.ruleValue, highlight ? { color: TOKENS.Primary } : null]}>
          {value}
        </Text>
      )}
    </View>
  </View>
);

const LEVELS = [
  { level: 1, xp: 0, title: 'Rookie Saver' },
  { level: 5, xp: 2000, title: 'Expense Hunter' },
  { level: 10, xp: 4500, title: 'Budget Warrior' },
  { level: 15, xp: 7000, title: 'Money Strategist' },
  { level: 20, xp: 9500, title: 'Smart Investor' },
  { level: 30, xp: 14500, title: 'Wealth Architect' },
  { level: 50, xp: 24500, title: 'Financial Master' },
];

const FinanceQuestRulebookScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header Introduction */}
        <View style={styles.headerContainer}>
          <View style={styles.badgeWrapper}>
            <BookOpen size={14} color={TOKENS.Primary} style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>OFFICIAL GUIDE</Text>
          </View>
          <Text style={styles.mainTitle}>Finance Quest Rulebook</Text>
          <Text style={styles.mainSubtitle}>
            The complete reference for how points, levels, streaks, badges, wellness, and challenges work in your financial journey.
          </Text>
        </View>

        {/* XP Section */}
        <SectionData icon={Zap} title="Experience Points (XP)" colorKey="amber">
          <View style={styles.rowsContainer}>
            <RuleRow emoji="💳" label="Log any transaction" value="+2 XP" highlight />
            <RuleRow emoji="🔥" label="Daily login + transaction" value="+3–5 XP (streak)" />
            <RuleRow emoji="🏅" label="Unlock new badge" value="+50 XP" highlight />
            <RuleRow emoji="⚔️" label="Complete daily/weekly quest" value="+15 to +40 XP" />
            <RuleRow emoji="🎯" label="Complete self-set challenge" value="+50 XP" highlight />
            <RuleRow emoji="🛡️" label="Daily XP cap" value="50 XP" />
          </View>
          <View style={[styles.tipBox, { backgroundColor: SECTIONS_COLORS.amber.bg, borderColor: SECTIONS_COLORS.amber.border }]}>
            <Text style={[styles.tipText, { color: SECTIONS_COLORS.amber.text }]}>
              <Text style={{ fontWeight: '700' }}>Pro Tip: </Text>
              Small, consistent actions compound fastest. Logging one expense every day gives far more XP over time than trying to binge-log once a week.
            </Text>
          </View>
        </SectionData>

        {/* Levels Section */}
        <SectionData icon={Trophy} title="Levels & Rank Titles" colorKey="purple">
          <View style={styles.tableContainer}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 0.5 }]}>LVL</Text>
              <Text style={[styles.th, { flex: 1 }]}>TOTAL XP</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>RANK TITLE</Text>
            </View>
            {LEVELS.map((l, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tdLevel, { flex: 0.5 }]}>{l.level}</Text>
                <Text style={[styles.tdXP, { flex: 1 }]}>{l.xp.toLocaleString()} XP</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-start' }}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>{l.title}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.formulaText}>
            Level formula: floor(total XP / 500) + 1{"\n"}— each level requires 500 additional XP.
          </Text>
        </SectionData>

        {/* Streak System */}
        <SectionData icon={Flame} title="Daily Streak System" colorKey="orange">
          <View style={styles.rowsContainer}>
            <RuleRow emoji="📅" label="Maintain streak" value="Log ≥1 trans/day" />
            <RuleRow emoji="🔗" label="Streak reset" value="Miss a day → 1" />
            <RuleRow emoji="🎁" label="Milestone bonus" value="+5 XP / 7 days" highlight />
            <RuleRow emoji="🏆" label="Lifetime record" value="Tracked forever" />
            <RuleRow emoji="📊" label="Visibility" value="Calendar shows 30 days" />
          </View>
        </SectionData>

        {/* Badges */}
        <SectionData icon={Shield} title="Badge Vault & Rarity" colorKey="blue">
          <Text style={styles.paragraphText}>
            Badges are permanent achievements. Each badge grants +50 XP the first time you earn it.
          </Text>
          <View style={styles.gridContainer}>
            {[
              { rarity: 'Common', colorKey: 'blue', desc: 'First steps & consistency' },
              { rarity: 'Uncommon', colorKey: 'indigo', desc: '7-day streaks, mastery' },
              { rarity: 'Rare', colorKey: 'purple', desc: '30-day streaks, challenge series' },
              { rarity: 'Epic', colorKey: 'amber', desc: 'High XP, diversified habits' },
              { rarity: 'Legendary', colorKey: 'emerald', desc: 'Master-level discipline' },
            ].map((r, i) => (
              <View key={i} style={styles.gridCard}>
                <Text style={[styles.rarityLabel, { color: SECTIONS_COLORS[r.colorKey].text }]}>
                  {r.rarity}
                </Text>
                <Text style={styles.rarityDesc}>{r.desc}</Text>
              </View>
            ))}
          </View>
        </SectionData>

        {/* Wellness Score */}
        <SectionData icon={Heart} title="Financial Wellness Score" colorKey="emerald">
          <Text style={styles.paragraphText}>
            Scored 0–100 every month. Updated after the 1st of each month.
          </Text>
          <View style={styles.rowsContainer}>
            {[
              { name: 'Savings Rate', weight: '25%', desc: 'Percentage of income saved' },
              { name: 'Budget Adherence', weight: '25%', desc: 'How closely you follow budgets' },
              { name: 'Overspending Control', weight: '20%', desc: 'Avoiding large impulse spends' },
              { name: 'Category Balance', weight: '15%', desc: 'Diversified spending pattern' },
              { name: 'Logging Consistency', weight: '15%', desc: 'Regular daily entries' },
            ].map((m, i) => (
              <View key={i} style={styles.wellnessRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.wellnessTitle}>{m.name}</Text>
                  <Text style={styles.wellnessDesc}>{m.desc}</Text>
                </View>
                <View style={styles.weightBadge}>
                  <Text style={styles.weightText}>{m.weight}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.scoreGrid}>
            {[
              { range: '0–39', label: 'Needs Attention', colorKey: 'amber' }, // Mapped red to amber for FAANG UI
              { range: '40–59', label: 'Developing', colorKey: 'orange' },
              { range: '60–79', label: 'Solid', colorKey: 'blue' },
              { range: '80–100', label: 'Excellent', colorKey: 'emerald' },
            ].map((r, i) => (
              <View key={i} style={styles.scoreCard}>
                <Text style={[styles.scoreLabel, { color: SECTIONS_COLORS[r.colorKey].text }]}>{r.label}</Text>
                <Text style={styles.scoreRange}>{r.range}</Text>
              </View>
            ))}
          </View>
        </SectionData>

        {/* Quests */}
        <SectionData icon={Target} title="Quests & Challenges" colorKey="indigo">
          <View style={styles.rowsContainer}>
            <RuleRow emoji="🤖" label="Quest generation" value="AI-personalized" />
            <RuleRow emoji="📆" label="Daily quests" value="Expire at midnight" />
            <RuleRow emoji="📅" label="Weekly quests" value="7-day duration" />
            <RuleRow emoji="✅" label="Accept / Reject" value="Choose what fits" />
            <RuleRow emoji="⚡" label="Quest XP" value="Easy 15 • Med 25 • Hard 40" />
            <RuleRow emoji="🎯" label="Self-set Challenges" value="+50 XP on success" highlight />
          </View>
        </SectionData>

        <Text style={styles.footerText}>— End of Finance Quest Rulebook —</Text>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.Surface,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.PrimaryLight + '20', // 20% opacity using alpha
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: TOKENS.Primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: TOKENS.TextPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  mainSubtitle: {
    fontSize: 15,
    color: TOKENS.TextSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: TOKENS.Background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.Borders,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.Surface,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TOKENS.TextPrimary,
  },
  sectionBody: {
    padding: 16,
  },
  rowsContainer: {
    backgroundColor: TOKENS.Surface,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.Borders,
    alignItems: 'center',
  },
  ruleEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  ruleContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TOKENS.TextPrimary,
    flex: 1,
    paddingRight: 8,
  },
  ruleValue: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.TextSecondary,
  },
  tipBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.Borders,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: TOKENS.Surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.Borders,
  },
  th: {
    fontSize: 11,
    fontWeight: '600',
    color: TOKENS.TextSecondary,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.Surface,
    alignItems: 'center',
  },
  tdLevel: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.TextPrimary,
  },
  tdXP: {
    fontSize: 13,
    color: TOKENS.TextSecondary,
  },
  rankBadge: {
    backgroundColor: TOKENS.PrimaryLight + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.Primary,
  },
  formulaText: {
    marginTop: 16,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  paragraphText: {
    fontSize: 14,
    color: TOKENS.TextSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: TOKENS.Surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.Borders,
  },
  rarityLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  rarityDesc: {
    fontSize: 13,
    color: TOKENS.TextSecondary,
    lineHeight: 18,
  },
  wellnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.Borders,
  },
  wellnessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.TextPrimary,
    marginBottom: 2,
  },
  wellnessDesc: {
    fontSize: 12,
    color: TOKENS.TextSecondary,
  },
  weightBadge: {
    backgroundColor: SECTIONS_COLORS.emerald.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  weightText: {
    fontSize: 12,
    fontWeight: '700',
    color: SECTIONS_COLORS.emerald.text,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  scoreCard: {
    width: '48%',
    backgroundColor: TOKENS.Surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.Borders,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  scoreRange: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  footerText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 16,
  },
});

export default FinanceQuestRulebookScreen;
