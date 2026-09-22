import { ExpoConfig } from "expo/config";

const variant = (process.env.APP_VARIANT ?? "consumer") as "consumer" | "contractor";
const isPro = variant === "contractor";

const config: ExpoConfig = {
  name: isPro ? "MrBuilder PRO" : "MrBuilder",
  slug: "mrbuilder",
  version: "1.0.0",
  orientation: "portrait",
  icon: isPro ? "./assets/icon-pro.png" : "./assets/icon.png",
  scheme: isPro ? "mrbuilderpro" : "mrbuilder",
  userInterfaceStyle: "automatic",
  splash: { image: "./assets/splash-icon.png", resizeMode: "contain", backgroundColor: isPro ? "#181D27" : "#EF6820" },
  ios: { bundleIdentifier: isPro ? "com.omphire.mrbuilder.pro" : "com.omphire.mrbuilder", supportsTablet: false, infoPlist: {
      ITSAppUsesNonExemptEncryption: false, NSCameraUsageDescription: "Photos of the work area, before and after the job.", NSPhotoLibraryUsageDescription: "Attach photos to your requests and jobs.", NSLocationWhenInUseUsageDescription: "Show jobs near you and share your ETA." } },
  android: { package: isPro ? "com.omphire.mrbuilder.pro" : "com.omphire.mrbuilder", adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#EF6820" }, permissions: ["CAMERA", "ACCESS_FINE_LOCATION"] },
  plugins: ["expo-secure-store", "expo-font", "expo-location", "expo-image-picker", "expo-notifications"],
  runtimeVersion: { policy: "appVersion" },
  updates: { url: (process.env.EAS_PROJECT_ID ?? "f511be99-288d-4634-9ab5-5fd156589a4d") ? `https://u.expo.dev/${(process.env.EAS_PROJECT_ID ?? "f511be99-288d-4634-9ab5-5fd156589a4d")}` : undefined },
  extra: { variant, apiUrl: process.env.API_URL ?? "https://new.mrbuilder.com/api/v1", eas: { projectId: (process.env.EAS_PROJECT_ID ?? "f511be99-288d-4634-9ab5-5fd156589a4d") } },
};

export default config;
