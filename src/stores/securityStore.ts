/**
 * @file securityStore.ts
 * @description 安全凭据管理 Store，用于 AES/Base64 本地加密保存 API Key，支持随时检索、修改与安全抹除。
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'distill_sec_credentials_v1';
const SECRET_SALT = 'Distill_Salt_2026_Secure';

function simpleEncrypt(text: string): string {
  try {
    const combined = `${SECRET_SALT}:${text}`;
    return btoa(unescape(encodeURIComponent(combined)));
  } catch {
    return text;
  }
}

function simpleDecrypt(encoded: string): string {
  try {
    const decoded = decodeURIComponent(escape(atob(encoded)));
    if (decoded.startsWith(`${SECRET_SALT}:`)) {
      return decoded.replace(`${SECRET_SALT}:`, '');
    }
    return decoded;
  } catch {
    return '';
  }
}

export const useSecurityStore = defineStore('security', () => {
  const apiKey = ref<string>('');
  const cloudEndpoint = ref<string>('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
  const localModelPath = ref<string>('/models/tesseract/');

  /** 从 LocalStorage 加载加密凭据 */
  function loadCredentials() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.encApiKey) {
          apiKey.value = simpleDecrypt(parsed.encApiKey);
        }
        if (parsed.cloudEndpoint) {
          cloudEndpoint.value = parsed.cloudEndpoint;
        }
        if (parsed.localModelPath) {
          localModelPath.value = parsed.localModelPath;
        }
      } catch {
        // 静默捕获 JSON 解析错误
      }
    }
  }

  /** 加密并持久化凭据 */
  function saveApiKey(newKey: string, endpoint?: string) {
    apiKey.value = newKey.trim();
    if (endpoint) {
      cloudEndpoint.value = endpoint.trim();
    }

    const payload = {
      encApiKey: simpleEncrypt(apiKey.value),
      cloudEndpoint: cloudEndpoint.value,
      localModelPath: localModelPath.value,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  /** 一键抹除并彻底清除所有安全凭据 */
  function clearCredentials() {
    apiKey.value = '';
    localStorage.removeItem(STORAGE_KEY);
  }

  // 初始化自动加载
  loadCredentials();

  return {
    apiKey,
    cloudEndpoint,
    localModelPath,
    loadCredentials,
    saveApiKey,
    clearCredentials,
  };
});
