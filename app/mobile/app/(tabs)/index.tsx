import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import DeliveryCard from '../../src/features/deliveries/components/DeliveryCard';
import { openMaps } from '../../src/features/deliveries/openMaps';
import { transformSessionToDriverRoute } from '../../src/features/deliveries/transformSession';
import type { DriverRoute, DeliveryStop, OptimizeRequestLike } from '../../src/features/deliveries/types';

type FilterKey = 'pending' | 'failed' | 'completed';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const router = useRouter();

  const [route, setRoute] = useState<DriverRoute | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('pending');
  const [reportStopId, setReportStopId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [navigationStop, setNavigationStop] = useState<DeliveryStop | null>(null);

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
      const parsed = JSON.parse(text) as any;

      const optimizeRequest: OptimizeRequestLike = 'data' in parsed ? parsed.data ?? {} : parsed;
      const nextRoute = transformSessionToDriverRoute(optimizeRequest);

      setRoute(nextRoute);
      setOpenId(nextRoute.stops[0]?.id ?? null);
      setActiveFilter('pending');
    } catch {
      Alert.alert('Import failed', 'Please upload a valid route JSON file.');
    }
  };

  const updateStop = (stopId: string, updater: (stop: DeliveryStop) => DeliveryStop) => {
    setRoute((current: DriverRoute | null) => {
      if (!current) return current;

      return {
        ...current,
        stops: current.stops.map((stop: DeliveryStop) => (stop.id === stopId ? updater(stop) : stop)),
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

  const openInAppNavigation = (stop: DeliveryStop) => {
    router.push({
      pathname: '/navigation' as any,
      params: {
        stopNumber: String(stop.stopNumber),
        customerName: stop.customerName,
        phoneNumber: stop.phoneNumber ?? '',
        address: stop.address,
        packageCount: String(stop.packageCount),
        lat: String(stop.lat),
        lng: String(stop.lng),
      },
    });
  };

  const handleNavigateChoice = (stop: DeliveryStop) => {
    setNavigationStop(stop);
  };

  const openGoogleMapsExternal = async () => {
    if (!navigationStop) return;

    await openMaps({
      lat: navigationStop.lat,
      lng: navigationStop.lng,
      address: navigationStop.address,
    });

    setNavigationStop(null);
  };

  const openReportModal = (stopId: string) => {
    setReportStopId(stopId);
    setReportReason('');
  };

  const submitReport = () => {
    if (!reportStopId) return;

    if (!reportReason.trim()) {
      Alert.alert('Reason required', 'Please enter why the delivery could not be completed.');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    updateStop(reportStopId, (stop) => ({
      ...stop,
      notes: '',
      status: 'failed',
      failureReason: reportReason.trim(),
    }));

    setOpenId(null);
    setReportStopId(null);
    setReportReason('');
    setActiveFilter('failed');
  };

  const sortedStops = useMemo(() => {
    if (!route) return [];

    const rank: Record<string, number> = {
      pending: 0,
      completed: 1,
      failed: 2,
    };

    return [...route.stops].sort((a: DeliveryStop, b: DeliveryStop) => {
      const statusDiff = rank[a.status] - rank[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.stopNumber - b.stopNumber;
    });
  }, [route]);

  const filteredStops = useMemo(() => {
    return sortedStops.filter((stop) => stop.status === activeFilter);
  }, [sortedStops, activeFilter]);

  const remaining = route?.stops.filter((stop: DeliveryStop) => stop.status === 'pending').length ?? 0;
  const completed = route?.stops.filter((stop: DeliveryStop) => stop.status === 'completed').length ?? 0;
  const incomplete = route?.stops.filter((stop: DeliveryStop) => stop.status === 'failed').length ?? 0;
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
            <Pressable
              style={[styles.statBlock, activeFilter === 'pending' && styles.activeStatBlock]}
              onPress={() => setActiveFilter('pending')}
            >
              <Text style={styles.statNumber}>{remaining}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </Pressable>

            <Pressable
              style={[styles.statBlock, activeFilter === 'failed' && styles.activeStatBlock]}
              onPress={() => setActiveFilter('failed')}
            >
              <Text style={styles.statNumber}>{incomplete}</Text>
              <Text style={styles.statLabel}>Incomplete</Text>
            </Pressable>

            <Pressable
              style={[styles.statBlock, activeFilter === 'completed' && styles.activeStatBlock]}
              onPress={() => setActiveFilter('completed')}
            >
              <Text style={styles.statNumber}>{completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {activeFilter === 'pending'
            ? 'Remaining Stops'
            : activeFilter === 'failed'
            ? 'Incomplete Stops'
            : 'Completed Stops'}
        </Text>

        {filteredStops.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No stops in this section.</Text>
          </View>
        ) : (
          filteredStops.map((stop) => (
            <DeliveryCard
              key={stop.id}
              stop={stop}
              isOpen={openId === stop.id}
              onToggle={() => handleToggle(stop.id)}
              onChangeNote={(value: string) => handleChangeNote(stop.id, value)}
              onComplete={() => handleComplete(stop.id)}
              onNavigate={() => handleNavigateChoice(stop)}
              onReportPress={() => openReportModal(stop.id)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!reportStopId}
        transparent
        animationType="fade"
        onRequestClose={() => setReportStopId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Incomplete Delivery</Text>
            <Text style={styles.modalSubtitle}>
              Add the reason this stop could not be completed.
            </Text>

            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Example: Gate locked, no access, customer unavailable"
              multiline
              style={styles.modalInput}
            />

            <View style={styles.modalButtonRow}>
              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setReportStopId(null);
                  setReportReason('');
                }}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.modalPrimaryButton} onPress={submitReport}>
                <Text style={styles.modalPrimaryText}>Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!navigationStop}
        transparent
        animationType="fade"
        onRequestClose={() => setNavigationStop(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Navigation Mode</Text>
            <Text style={styles.modalSubtitle}>
              Compare both options and see which experience works best.
            </Text>

            <View style={styles.choiceButtonStack}>
              <Pressable
                style={styles.choicePrimaryButton}
                onPress={() => {
                  if (navigationStop) {
                    openInAppNavigation(navigationStop);
                  }
                  setNavigationStop(null);
                }}
              >
                <Text style={styles.choicePrimaryText}>View in App</Text>
              </Pressable>

              <Pressable
                style={styles.choiceSecondaryButton}
                onPress={openGoogleMapsExternal}
              >
                <Text style={styles.choiceSecondaryText}>Open in Google Maps</Text>
              </Pressable>

              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => setNavigationStop(null)}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 10,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
  },
  activeStatBlock: {
    backgroundColor: '#e5e7eb',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  emptyState: {
    backgroundColor: '#f9fafb',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  modalInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryText: {
    fontWeight: '600',
    color: '#111827',
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontWeight: '600',
    color: '#ffffff',
  },
  choiceButtonStack: {
    gap: 10,
  },
  choicePrimaryButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  choicePrimaryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  choiceSecondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  choiceSecondaryText: {
    color: '#111827',
    fontWeight: '600',
  },
});