import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, 
  Platform, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Send, Bot, History, Plus, Brain, 
  MessageSquare, Trash2, X, ChevronLeft,
  Sparkles, Wallet, BarChart3, TrendingUp, Target
} from 'lucide-react-native';

import { 
  sendAgentMessage, getConversations, getConversation, 
  deleteConversation, clearAllHistory 
} from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import ChatBubble from '../../components/agent/ChatBubble';
import PlanStepper from '../../components/agent/PlanStepper';

const COLORS = {
  primary: '#1E6BD6',
  primaryLight: '#4C8DF0',
  primaryDark: '#154EA1',
  background: '#FFFFFF',
  surface: '#F5F7FA',
  textPrimary: '#0D1B2A',
  textSecondary: '#44556B',
  border: '#E0E6EE',
  success: '#10B981',
  danger: '#EF4444',
};

const WELCOME_GROUPS = [
  { label: 'Spending', icon: Wallet, items: ['Show my spending this month', 'Top merchants this month'] },
  { label: 'Analytics', icon: BarChart3, items: ['Financial health score', 'Cash runway analysis'] },
  { label: 'Investments', icon: TrendingUp, items: ['List my investments', 'Sector allocation'] },
  { label: 'Goals', icon: Target, items: ['My goals progress', 'How can I save more?'] },
];

export default function AgentChatScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Streaming state
  const [streamingText, setStreamingText] = useState('');
  const [statusText, setStatusText] = useState('');
  const [planSteps, setPlanSteps] = useState(null);
  const [currentPlanStep, setCurrentPlanStep] = useState(0);
  const [isPlanComplete, setIsPlanComplete] = useState(false);
  const [streamingInsights, setStreamingInsights] = useState([]);
  const [streamingCharts, setStreamingCharts] = useState([]);

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const flatListRef = useRef(null);
  const streamAbortRef = useRef(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const data = await getConversations();
      setConversations(data.conversations || []);
    } catch (err) {}
  };

  const loadConversation = async (id) => {
    try {
      setIsLoading(true);
      const data = await getConversation(id);
      setMessages(data.messages || []);
      setActiveConversationId(id);
      setHistoryModalVisible(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingText('');
    setPlanSteps(null);
    setHistoryModalVisible(false);
  };

  const handleSend = useCallback(async (textOverride) => {
    const text = (textOverride || inputValue).trim();
    if (!text || isLoading) return;

    setInputValue('');
    setIsLoading(true);
    setStreamingText('');
    setStatusText('Thinking...');
    setPlanSteps(null);
    setCurrentPlanStep(0);
    setIsPlanComplete(false);
    setStreamingInsights([]);
    setStreamingCharts([]);

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    let fullText = '';
    streamAbortRef.current = sendAgentMessage(text, activeConversationId, null, {
      onToken: (t) => {
        fullText += t;
        setStreamingText(fullText);
      },
      onStatus: (st) => {
        setStatusText(st.message || '');
        if (st.stepIndex !== undefined) setCurrentPlanStep(st.stepIndex);
      },
      onPlan: (p) => setPlanSteps(p.steps),
      onInsight: (i) => setStreamingInsights(i.insights),
      onCharts: (c) => setStreamingCharts(c.charts),
      onComplete: (data) => {
        setStreamingText('');
        setIsLoading(false);
        setIsPlanComplete(true);
        setStatusText('');
        
        const assistantMsg = {
          role: 'assistant',
          content: fullText,
          timestamp: new Date().toISOString(),
          metadata: {
            charts: data.charts || streamingCharts || [],
            insights: data.insights || streamingInsights || [],
            dataSources: data.dataSources || [],
            suggestions: data.suggestions || [],
            confirmationRequired: data.confirmationRequired,
            pendingAction: data.pendingAction,
          }
        };
        setMessages(prev => [...prev, assistantMsg]);
        setPlanSteps(null);
        if (data.conversationId) {
          setActiveConversationId(data.conversationId);
          loadHistory();
        }
      },
      onError: (err) => {
        setIsLoading(false);
        setStatusText('');
        setPlanSteps(null);
        Alert.alert('Error', err);
      }
    });
  }, [inputValue, isLoading, activeConversationId, streamingCharts, streamingInsights]);

  const handleConfirm = async (nonce) => {
    setIsLoading(true);
    let fullText = '';
    sendAgentMessage(null, activeConversationId, { nonce }, {
      onToken: (t) => { fullText += t; setStreamingText(fullText); },
      onComplete: (data) => {
        setStreamingText('');
        setIsLoading(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: fullText,
          timestamp: new Date().toISOString(),
          metadata: data
        }]);
      },
      onError: (err) => { setIsLoading(false); Alert.alert('Error', err); }
    });
  };

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeHeader}>
        <View style={styles.botIcon}>
          <Brain size={32} color="#FFF" />
        </View>
        <Text style={styles.welcomeTitle}>Financial Agent</Text>
        <Text style={styles.welcomeSub}>I can help you analyze spending, manage budgets, or track investments.</Text>
      </View>

      <View style={styles.groupsContainer}>
        {WELCOME_GROUPS.map((group, idx) => (
          <View key={idx} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <group.icon size={14} color={COLORS.primary} />
              <Text style={styles.groupLabel}>{group.label}</Text>
            </View>
            <View style={styles.groupItems}>
              {group.items.map((item, i) => (
                <TouchableOpacity key={i} onPress={() => handleSend(item)} style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderMessage = ({ item }) => (
    <ChatBubble 
      message={item} 
      onConfirm={handleConfirm}
      onCancel={() => setMessages(prev => [...prev, { role: 'assistant', content: 'Action cancelled.', timestamp: new Date().toISOString() }])}
      onSuggestionSelect={(s) => handleSend(s)}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <TouchableOpacity onPress={() => setHistoryModalVisible(true)} style={styles.historyButton}>
          <History size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.chatArea}>
        {messages.length === 0 ? (
          renderWelcome()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              (isLoading || streamingText) ? (
                <View>
                  {planSteps && (
                    <View style={{ paddingHorizontal: 16 }}>
                      <PlanStepper steps={planSteps} currentStep={currentPlanStep} isComplete={isPlanComplete} />
                    </View>
                  )}
                  {streamingText ? (
                    <ChatBubble 
                      message={{ 
                        role: 'assistant', 
                        content: streamingText, 
                        timestamp: new Date().toISOString(),
                        metadata: { insights: streamingInsights, charts: streamingCharts }
                      }} 
                    />
                  ) : (
                    <View style={styles.loadingBubble}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.statusText}>{statusText}</Text>
                    </View>
                  )}
                </View>
              ) : null
            }
          />
        )}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
            <Plus size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ask anything..."
            value={inputValue}
            onChangeText={setInputValue}
            multiline
            maxHeight={100}
          />
          <TouchableOpacity 
            onPress={() => handleSend()} 
            style={[styles.sendButton, (!inputValue.trim() || isLoading) && styles.sendButtonDisabled]}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={conversations}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.historyItem, activeConversationId === item._id && styles.historyItemActive]} 
                  onPress={() => loadConversation(item._id)}
                >
                  <MessageSquare size={16} color={activeConversationId === item._id ? COLORS.primary : COLORS.textSecondary} />
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyText, activeConversationId === item._id && styles.historyTextActive]} numberOfLines={1}>
                      {item.title || 'Untitled Chat'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.historyList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chatArea: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 16,
  },
  welcomeContainer: {
    flex: 1,
    padding: 24,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  botIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  groupsContainer: {
    gap: 16,
  },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupItems: {
    gap: 8,
  },
  suggestionItem: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  historyItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  historyInfo: {
    flex: 1,
  },
  historyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyTextActive: {
    color: COLORS.primary,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
