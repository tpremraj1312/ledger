import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import SmsListener from 'react-native-android-sms-listener';
import useSmsStore from '../store/smsStore';
import { useFinancial } from '../context/FinancialContext';
import api from '../api/axios';

const SmsAutoListener = () => {
  const { refreshData } = useFinancial();

  useEffect(() => {
    // SMS Listener is only available on Android
    if (Platform.OS !== 'android') return;

    let subscription = null;

    const startListening = async () => {
      try {
        const grantedReceive = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          {
            title: "SMS Auto-Sync Permission",
            message: "Ledger needs to read incoming bank SMS to log your transactions automatically in real time.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        
        // Also good practice to request READ_SMS if reading historical
        const grantedRead = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS
        );

        if (grantedReceive === PermissionsAndroid.RESULTS.GRANTED || grantedRead === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[SmsAutoListener] Permissions granted. Subscribing to incoming SMS...');
          
          // Auto-init store if not already initialized
          const store = useSmsStore.getState();
          if (store.transactions.length === 0) {
            await store.initialize();
          }

          subscription = SmsListener.addListener(async (message) => {
            console.log('[SmsAutoListener] New SMS received from:', message.originatingAddress);
            
            try {
              // Ensure store settings allow autoSync
              const state = useSmsStore.getState();
              if (state.settings && !state.settings.autoSyncEnabled) {
                console.log('[SmsAutoListener] Auto-sync disabled in settings. Ignoring.');
                return;
              }

              const result = state.processSms(message.body, message.originatingAddress, false);
              
              if (result) {
                console.log('[SmsAutoListener] Financial SMS parsed perfectly. Syncing to backend...');
                await api.post('/api/sms/sync', { transactions: [result] });
                console.log('[SmsAutoListener] Backend sync successful. Refreshing UI context...');
                await refreshData(true);
              } else {
                 console.log('[SmsAutoListener] SMS ignored (not financial or duplicate).');
              }
            } catch (err) {
              console.error('[SmsAutoListener] Error in processing or parsing incoming SMS:', err);
            }
          });
        } else {
          console.log('[SmsAutoListener] SMS permissions were denied.');
        }
      } catch (err) {
        console.warn('[SmsAutoListener] Failed to initialize SMS listener:', err);
      }
    };

    startListening();

    return () => {
      if (subscription) {
        subscription.remove();
        console.log('[SmsAutoListener] Removed SMS listener subscription.');
      }
    };
  }, [refreshData]);

  // Invisible background component
  return null;
};

export default SmsAutoListener;
