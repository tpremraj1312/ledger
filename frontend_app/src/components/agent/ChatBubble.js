import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bot, CheckCircle2, XCircle, Database, Play } from 'lucide-react-native';
import PlanStepper from './PlanStepper';
import InsightCard from './InsightCard';
import ChartCarousel from './ChartCarousel';

const COLORS = {
  primary: '#1E6BD6',
  background: '#FFFFFF',
  textPrimary: '#0D1B2A',
  textSecondary: '#44556B',
  border: '#E0E6EE',
  surface: '#F5F7FA',
  danger: '#EF4444',
  success: '#10B981',
};

const formatTime = (isoString) => {
  const date = new Date(isoString || Date.now());
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const DataAttribution = ({ sources }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <View style={styles.attribution}>
      <Database size={10} color="#94A3B8" />
      <Text style={styles.attributionText}>
        Based on: {sources.join(' · ')}
      </Text>
    </View>
  );
};

const SuggestionChips = ({ suggestions, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <View style={styles.suggestions}>
      {suggestions.map((s, i) => (
        <TouchableOpacity key={i} onPress={() => onSelect(s)} style={styles.chip}>
          <Text style={styles.chipText}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const ExpandableText = ({ text, previewLength = 500 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text || text.length <= previewLength) return <Text style={styles.messageText}>{text}</Text>;

  return (
    <View>
      <Text style={styles.messageText}>
        {expanded ? text : text.substring(0, previewLength) + '…'}
      </Text>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Text style={styles.expandButton}>
          {expanded ? '▲ Show less' : '▼ Show more'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function ChatBubble({ message, onConfirm, onCancel, onSuggestionSelect, onAction }) {
  const isUser = message.role === 'user';
  const meta = message.metadata || {};

  return (
    <View style={[styles.container, isUser && styles.containerUser]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Bot size={16} color="#FFFFFF" />
        </View>
      )}
      
      <View style={[styles.bubbleWrapper, isUser && styles.bubbleWrapperUser]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          {message.content ? (
            <ExpandableText text={message.content} />
          ) : null}

          {/* v2: Insight Cards */}
          {!isUser && meta.insights && meta.insights.length > 0 && (
            <View style={styles.metaSection}>
              {meta.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </View>
          )}

          {/* v2: Multi-chart carousel */}
          {!isUser && meta.charts && meta.charts.length > 0 && (
            <ChartCarousel charts={meta.charts} />
          )}

          {/* Confirmation Flow */}
          {meta.confirmationRequired && meta.pendingAction && (
            <View style={styles.confirmationBox}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.acceptButton]}
                onPress={() => onConfirm(meta.pendingAction.nonce)}
              >
                <CheckCircle2 size={14} color={COLORS.success} />
                <Text style={styles.acceptButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={onCancel}
              >
                <XCircle size={14} color={COLORS.textSecondary} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Attribution */}
          {!isUser && meta.dataSources && meta.dataSources.length > 0 && (
            <DataAttribution sources={meta.dataSources} />
          )}
        </View>

        {/* Suggestions outside bubble for readability */}
        {!isUser && meta.suggestions && meta.suggestions.length > 0 && !meta.confirmationRequired && (
          <SuggestionChips suggestions={meta.suggestions} onSelect={onSuggestionSelect} />
        )}

        <Text style={[styles.time, isUser && styles.timeUser]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>

      {isUser && (
        <View style={[styles.avatar, styles.avatarUser]}>
          <Text style={styles.avatarText}>U</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    gap: 10,
  },
  containerUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  avatarUser: {
    backgroundColor: COLORS.textPrimary,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bubbleWrapper: {
    flex: 1,
    maxWidth: '85%',
  },
  bubbleWrapperUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textPrimary,
  },
  bubbleUserText: {
    color: '#FFFFFF',
  },
  expandButton: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 6,
  },
  metaSection: {
    marginTop: 12,
    gap: 8,
  },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    opacity: 0.6,
  },
  attributionText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 4,
  },
  timeUser: {
    marginRight: 4,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmationBox: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: COLORS.success + '10',
    borderColor: COLORS.success + '20',
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
