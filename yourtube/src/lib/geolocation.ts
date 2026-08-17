export const detectUserCity = (): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve("Unknown");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (!response.ok) {
            resolve("Unknown");
            return;
          }

          const data = await response.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.state ||
            "Unknown";
          resolve(city);
        } catch {
          resolve("Unknown");
        }
      },
      () => resolve("Unknown"),
      { timeout: 10000, maximumAge: 300000 }
    );
  });
};
