import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// requestAnimationFrame polyfill for CountUp component
// In tests, we want it to complete immediately
let lastRafTime = 0;
global.requestAnimationFrame = (callback) => {
  lastRafTime += 10000;
  const timeoutId = setTimeout(() => callback(lastRafTime), 0);
  return timeoutId as any;
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id as any);
};
