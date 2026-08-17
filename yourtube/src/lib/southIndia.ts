export const SOUTH_INDIAN_STATES = {
  "Tamil Nadu": { minLat: 8.07, maxLat: 13.35, minLng: 76.23, maxLng: 80.35 },
  Kerala: { minLat: 8.18, maxLat: 12.79, minLng: 74.85, maxLng: 77.42 },
  Karnataka: { minLat: 11.59, maxLat: 18.45, minLng: 74.05, maxLng: 78.57 },
  "Andhra Pradesh": { minLat: 12.62, maxLat: 19.92, minLng: 76.76, maxLng: 84.74 },
  Telangana: { minLat: 15.8, maxLat: 19.92, minLng: 77.2, maxLng: 81.34 },
};

export const SOUTH_INDIAN_STATE_NAMES = Object.keys(SOUTH_INDIAN_STATES);

export function detectSouthIndianState(lat: number, lng: number): string | null {
  for (const [state, box] of Object.entries(SOUTH_INDIAN_STATES)) {
    if (
      lat >= box.minLat &&
      lat <= box.maxLat &&
      lng >= box.minLng &&
      lng <= box.maxLng
    ) {
      return state;
    }
  }
  return null;
}

export function getIstDate(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}

export function isMorningWindowIst(): boolean {
  const ist = getIstDate();
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  return minutes >= 10 * 60 && minutes <= 12 * 60;
}

export function shouldUseLightTheme(state: string | null): boolean {
  if (!state || !SOUTH_INDIAN_STATE_NAMES.includes(state)) {
    return false;
  }
  return isMorningWindowIst();
}

export function requestUserCoordinates(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

export async function detectUserState(): Promise<string | null> {
  const coords = await requestUserCoordinates();
  if (!coords) return null;
  return detectSouthIndianState(coords.latitude, coords.longitude);
}

export function resolveThemeFromState(state: string | null): "light" | "dark" {
  return shouldUseLightTheme(state) ? "light" : "dark";
}

export function isSouthIndianState(state: string | null): boolean {
  return !!state && SOUTH_INDIAN_STATE_NAMES.includes(state);
}
