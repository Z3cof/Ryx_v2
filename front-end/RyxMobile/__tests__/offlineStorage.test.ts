import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  savePendingTransaction,
  getPendingTransactions,
  removePendingTransaction,
  cacheData,
  getCachedData,
} from '../services/offlineStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    getItem: jest.fn(async (key: string) => {
      return store[key] || null;
    }),
    clear: jest.fn(async () => {
      for (const k in store) delete store[k];
    }),
  };
});

describe('Offline Storage Service', () => {
  const userId = 'user_123';

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('cacheData and getCachedData', () => {
    it('should save and retrieve generic cached data', async () => {
      const sampleData = { name: 'Ryx User', balance: 5000 };
      await cacheData('test_key', sampleData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('test_key', JSON.stringify(sampleData));

      const retrieved = await getCachedData<typeof sampleData>('test_key');
      expect(retrieved).toEqual(sampleData);
    });
  });

  describe('Pending Transaction Queue', () => {
    it('should start with an empty queue', async () => {
      const queue = await getPendingTransactions(userId);
      expect(queue).toEqual([]);
    });

    it('should save a pending transaction and generate a tempId', async () => {
      const txPayload = {
        userId,
        type: 'out' as const,
        title: 'Boutique achat',
        amount: 2500,
        category: 'Shopping',
        description: 'Offline test',
        currency: 'XOF',
        date: '2026-05-31',
      };

      const tempId = await savePendingTransaction(userId, txPayload);
      expect(tempId).toContain('local_');

      const queue = await getPendingTransactions(userId);
      expect(queue).toHaveLength(1);
      expect(queue[0]).toEqual(expect.objectContaining({
        ...txPayload,
        tempId,
      }));
    });

    it('should remove a pending transaction by tempId', async () => {
      const txPayload = {
        userId,
        type: 'in' as const,
        title: 'Salaire',
        amount: 150000,
        category: 'Salaire',
        currency: 'XOF',
        date: '2026-05-31',
      };

      const tempId = await savePendingTransaction(userId, txPayload);
      let queue = await getPendingTransactions(userId);
      expect(queue).toHaveLength(1);

      await removePendingTransaction(userId, tempId);
      queue = await getPendingTransactions(userId);
      expect(queue).toHaveLength(0);
    });
  });
});
