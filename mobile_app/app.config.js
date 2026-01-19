// App configuration with environment variables
// This replaces app.json and allows dynamic configuration

export default {
  expo: {
    name: "PocketExpense+",
    slug: "pocketexpense-plus",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.pocketexpenseplus.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "READ_SMS",
        "RECEIVE_SMS"
      ],
      package: "com.pocketexpenseplus.app"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      localIp: "192.168.31.135",
      localPort: "5000",
      productionUrl: "https://pocketexpense-backend.onrender.com/api",
      useProduction: true,
      eas: {
        projectId: "dfa583ee-e533-4311-9463-28eeaa67daaf"
      }
    }
  }
};

