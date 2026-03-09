import { Alert, Linking, Platform } from 'react-native';

type OpenMapsParams = {
  lat: number;
  lng: number;
  address?: string;
};

export async function openMaps({ lat, lng, address }: OpenMapsParams) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    Alert.alert('Navigation unavailable', 'This stop does not have valid coordinates.');
    return;
  }

  const label = address ? encodeURIComponent(address) : 'Destination';
  const destination = `${lat},${lng}`;

  const googleMapsAppUrl =
    Platform.OS === 'ios'
      ? `comgooglemaps://?daddr=${destination}&q=${label}&directionsmode=driving`
      : `google.navigation:q=${destination}`;

  const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${destination}&q=${label}`;

  try {
    const canOpenGoogleApp = await Linking.canOpenURL(googleMapsAppUrl);

    if (canOpenGoogleApp) {
      await Linking.openURL(googleMapsAppUrl);
      return;
    }

    const canOpenGoogleWeb = await Linking.canOpenURL(googleMapsWebUrl);

    if (canOpenGoogleWeb) {
      await Linking.openURL(googleMapsWebUrl);
      return;
    }

    await Linking.openURL(appleMapsUrl);
  } catch {
    Alert.alert('Navigation unavailable', 'Could not open a maps application.');
  }
}