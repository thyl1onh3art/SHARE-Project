import axios from 'axios';
import Constants from 'expo-constants';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://share-project-production.up.railway.app/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

export { API_BASE_URL };
export default client;
