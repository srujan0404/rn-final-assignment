import Constants from 'expo-constants';

const config = Constants.expoConfig?.extra || {};

const LOCAL_IP = config.localIp || '192.168.31.135';
const LOCAL_PORT = config.localPort || '5000';
const LOCAL_URL = `http://${LOCAL_IP}:${LOCAL_PORT}/api`;

const PRODUCTION_URL = config.productionUrl || 'https://pocketexpense-backend.onrender.com/api';
const USE_PRODUCTION = config.useProduction || false;

export const API_URL = USE_PRODUCTION ? PRODUCTION_URL : LOCAL_URL;
