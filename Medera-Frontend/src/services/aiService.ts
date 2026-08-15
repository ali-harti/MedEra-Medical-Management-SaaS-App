import aiApi from './aiApi';

export const checkAiHealth = () =>
  aiApi.get('/api/health').then(r => r.data);

export const getSymptomsList = () =>
  aiApi.get('/api/symptoms').then(r => r.data);

export const extractSymptoms = (text: string, lang: string) =>
  aiApi.post('/api/extract_symptoms', { text, lang }).then(r => r.data);

export const predict = (payload: {
  symptoms?: string[];
  free_text?: string;
  lang?: string;
  age?: number;
  sex?: 'M' | 'F';
  travel_tropical?: boolean;
  history_diabetes?: boolean;
  history_smoking?: boolean;
  min_confidence?: number;
}) => aiApi.post('/api/predict', payload).then(r => r.data);

export const submitFeedback = (
  telemetryId: string,
  predictionIndex: number,
  correct: boolean
) => aiApi.post('/api/feedback', {
  telemetry_id: telemetryId,
  prediction_index: predictionIndex,
  correct,
}).then(r => r.data);
