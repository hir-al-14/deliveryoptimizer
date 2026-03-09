import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function NavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stopNumber?: string;
    customerName?: string;
    phoneNumber?: string;
    address?: string;
    packageCount?: string;
    lat?: string;
    lng?: string;
  }>();

  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const destinationLat = Number(params.lat ?? 0);
  const destinationLng = Number(params.lng ?? 0);

  useEffect(() => {
    let mounted = true;

    async function loadLocation() {
      try {
        setLoadingLocation(true);
        setLocationError(null);

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (mounted) {
            setLocationError('Location permission was denied. Showing destination only.');
          }
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!mounted) return;

        setOrigin({
          lat: current.coords.latitude,
          lng: current.coords.longitude,
        });
      } catch {
        if (mounted) {
          setLocationError('Could not get current location. Showing destination only.');
        }
      } finally {
        if (mounted) {
          setLoadingLocation(false);
        }
      }
    }

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  const mapUrl = useMemo(() => {
    const destination = `${destinationLat},${destinationLng}`;

    if (origin) {
      const originValue = `${origin.lat},${origin.lng}`;
      return `https://www.google.com/maps/dir/?api=1&origin=${originValue}&destination=${destination}&travelmode=driving&output=embed`;
    }

    return `https://www.google.com/maps?q=${destination}&z=15&output=embed`;
  }, [origin, destinationLat, destinationLng]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.topCard}>
            <View style={styles.topRow}>
              <Text style={styles.title}>Navigation</Text>
              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            </View>

            <Text style={styles.stopText}>Stop {params.stopNumber ?? '-'}</Text>
            <Text style={styles.nameText}>{params.customerName ?? 'Unknown Recipient'}</Text>

            {!!params.phoneNumber && (
              <Text style={styles.detailText}>Phone: {params.phoneNumber}</Text>
            )}

            <Text style={styles.detailText}>Address: {params.address ?? 'No address provided'}</Text>
            <Text style={styles.detailText}>Packages: {params.packageCount ?? '0'}</Text>

            {loadingLocation ? (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" />
                <Text style={styles.statusText}>Getting current location for route...</Text>
              </View>
            ) : locationError ? (
              <Text style={styles.warningText}>{locationError}</Text>
            ) : (
              <Text style={styles.successText}>Showing route from current location.</Text>
            )}
          </View>

          <View style={styles.mapWrapper}>
            <WebView
              source={{ uri: mapUrl }}
              style={styles.webView}
              startInLoadingState
            />
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  topCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  backButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stopText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
  },
  warningText: {
    marginTop: 10,
    fontSize: 14,
    color: '#b45309',
  },
  successText: {
    marginTop: 10,
    fontSize: 14,
    color: '#166534',
  },
  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 20,
    minHeight: 400,
  },
  webView: {
    flex: 1,
  },
});