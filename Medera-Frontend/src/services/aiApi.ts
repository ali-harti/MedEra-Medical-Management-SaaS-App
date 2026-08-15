import axios from 'axios';
import { AI_SERVICE_URL, AI_TOKEN } from '@/config/api';

const aiApi = axios.create({
  baseURL: AI_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Token': AI_TOKEN,
  },
});

export default aiApi;
