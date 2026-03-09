import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { DeliveryStop } from '../types';

type Props = {
  stop: DeliveryStop;
  isOpen: boolean;
  onToggle: () => void;
  onChangeNote: (value: string) => void;
  onComplete: () => void;
  onReport: () => void;
};

export default function DeliveryCard({
  stop,
  isOpen,
  onToggle,
  onChangeNote,
  onComplete,
  onReport,
}: Props) {
  if (!stop) {
    return null;
  }

  const isCompleted = stop.status === 'completed';
  const isFailed = stop.status === 'failed';
  const isHistory = isCompleted || isFailed;

  const handleReportPress = () => {
    if (!stop.notes.trim()) {
      Alert.alert('Note required', 'Please enter a note before reporting this stop.');
      return;
    }

    Alert.alert(
      'Report incomplete delivery?',
      `Note: ${stop.notes}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report Incomplete',
          style: 'destructive',
          onPress: onReport,
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.card,
        isCompleted && styles.completedCard,
        isFailed && styles.failedCard,
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.statusCircle,
            isCompleted && styles.completedCircle,
            isFailed && styles.failedCircle,
          ]}
        />
        <View style={styles.textBlock}>
          <Text style={styles.stopText}>Stop {stop.stopNumber}</Text>
          <Text style={styles.nameText}>{stop.customerName}</Text>
          {!!stop.phoneNumber && <Text style={styles.phoneText}>{stop.phoneNumber}</Text>}
          <Text style={styles.addressText}>{stop.address}</Text>
        </View>
      </View>

      {isOpen ? (
        <View style={styles.expandedSection}>
          <Text style={styles.metaText}>Packages: {stop.packageCount}</Text>

          <TextInput
            value={stop.notes}
            onChangeText={onChangeNote}
            placeholder="Add delivery note"
            multiline
            style={styles.noteInput}
          />

          {isCompleted && stop.completedAt ? (
            <Text style={styles.statusText}>Completed at: {stop.completedAt}</Text>
          ) : null}

          {isFailed && stop.failureReason ? (
            <Text style={styles.statusText}>Failure reason: {stop.failureReason}</Text>
          ) : null}

          <View style={styles.buttonRow}>
            {!isHistory ? (
              <>
                <Pressable style={styles.actionButton} onPress={onComplete}>
                  <Text style={styles.actionText}>Complete</Text>
                </Pressable>

                <Pressable style={styles.actionButton}>
                  <Text style={styles.actionText}>Navigate</Text>
                </Pressable>

                <Pressable style={styles.actionButton} onPress={handleReportPress}>
                  <Text style={styles.actionText}>Report</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  completedCard: {
    backgroundColor: '#e5e7eb',
  },
  failedCard: {
    backgroundColor: '#ede9fe',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginTop: 4,
    marginRight: 12,
  },
  completedCircle: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  failedCircle: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  textBlock: {
    flex: 1,
  },
  stopText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
    color: '#111827',
  },
  nameText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    color: '#374151',
  },
  expandedSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  metaText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 12,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionText: {
    fontWeight: '600',
    color: '#111827',
  },
});