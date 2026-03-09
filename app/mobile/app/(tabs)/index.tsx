import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import DeliveryCard from '../../src/features/deliveries/components/DeliveryCard';
import { transformSessionToDriverRoute } from '../../src/features/deliveries/transformSession';
import type { DriverRoute, DeliveryStop, OptimizeRequestLike } from '../../src/features/deliveries/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const [route, setRoute] = useState<DriverRoute | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const handleImportJson = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file?.uri) {
        Alert.alert('Import failed', 'No file was selected.');
        return;
      }

      const response = await fetch(file.uri);
      const text = await response.text();
      const parsed = JSON.parse(text) as { data?: OptimizeRequestLike } | OptimizeRequestLike;

      const optimizeRequest = 'data' in parsed ? parsed.data ?? {} : parsed;
      const nextRoute = transformSessionToDriverRoute(optimizeRequest);

      setRoute(nextRoute);
      setOpenId(nextRoute.stops[0]?.id ?? null);
    } catch {
      Alert.alert('Import failed', 'Please upload a valid route JSON file.');
    }
  };

  const updateStop = (stopId: string, updater: (stop: DeliveryStop) => DeliveryStop) => {
    setRoute((current) => {
      if (!current) return current;

      return {
        ...current,
        stops: current.stops.map((stop) => (stop.id === stopId ? updater(stop) : stop)),
      };
    });
  };

  const handleToggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((current) => (current === id ? null : id));
  };

  const handleChangeNote = (stopId: string, value: string) => {
    updateStop(stopId, (stop) => ({
      ...stop,
      notes: value,
    }));
  };

  const handleComplete = (stopId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    updateStop(stopId, (stop) => ({
      ...stop,
      status: 'completed',
      completedAt: new Date().toISOString(),
    }));

    setOpenId(null);
  };

  const handleReport = (stopId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    updateStop(stopId, (stop) => ({
      ...stop,
      status: 'failed',
      failureReason: stop.notes.trim(),
    }));

    setOpenId(null);
  };

  const sortedStops = useMemo(() => {
    if (!route) return [];

    const rank = {
      pending: 0,
      completed: 1,
      failed: 2,
    };

    return [...route.stops].sort((a, b) => {
      const statusDiff = rank[a.status] - rank[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.stopNumber - b.stopNumber;
    });
  }, [route]);

  const pendingStops = sortedStops.filter((stop) => stop.status === 'pending');
  const historyStops = sortedStops.filter((stop) => stop.status !== 'pending');

  const remaining = route?.stops.filter((stop) => stop.status === 'pending').length ?? 0;
  const completed = route?.stops.filter((stop) => stop.status === 'completed').length ?? 0;
  const incomplete = route?.stops.filter((stop) => stop.status === 'failed').length ?? 0;
  const total = route?.stops.length ?? 0;
  const progress = total === 0 ? 0 : completed / total;

  if (!route) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.uploadScreen}>
          <Text style={styles.appHeader}>Driver Assist</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleImportJson}>
            <Text style={styles.uploadButtonText}>Upload JSON</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.appHeader}>Driver Assist</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.headerLabel}>Current Route</Text>
          <Text style={styles.driverName}>{route.driverName}</Text>
          <Text style={styles.routeLabel}>{route.routeLabel}</Text>

          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Progress</Text>
            <Text style={styles.progressText}>
              {completed}/{total} Deliveries Complete
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{remaining}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{incomplete}</Text>
              <Text style={styles.statLabel}>Incomplete</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {pendingStops.filter(Boolean).map((stop) => (
          <DeliveryCard
            key={stop.id}
            stop={stop}
            isOpen={openId === stop.id}
            onToggle={() => handleToggle(stop.id)}
            onChangeNote={(value) => handleChangeNote(stop.id, value)}
            onComplete={() => handleComplete(stop.id)}
            onReport={() => handleReport(stop.id)}
          />
        ))}

        {historyStops.length > 0 ? (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>History</Text>
            {historyStops.filter(Boolean).map((stop) => (
              <DeliveryCard
                key={stop.id}
                stop={stop}
                isOpen={openId === stop.id}
                onToggle={() => handleToggle(stop.id)}
                onChangeNote={(value) => handleChangeNote(stop.id, value)}
                onComplete={() => {}}
                onReport={() => {}}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  uploadScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  appHeader: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  container: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#60a5fa',
  },
  headerLabel: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  routeLabel: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 15,
    color: '#111827',
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressFill: {
    height: 12,
    backgroundColor: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    paddingVertical: 18,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  historySection: {
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
});