import { useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { OnboardingRecurringSetup } from '../../components/OnboardingRecurringSetup';
import { INCOME_CATEGORIES } from '../../services/expenses';
import { createRecurringRule } from '../../services/recurring';
import { saveRecurringIncomeTemplates, type RecurringTemplate } from '../../services/recurringTemplatesStorage';

export default function OnboardingRecurringIncomeScreen() {
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const userId = params.userId || '';

  useEffect(() => {
    if (!userId) {
      router.replace('/auth/register');
    }
  }, [userId]);

  const goExpense = useCallback(() => {
    router.replace({
      pathname: '/auth/onboarding-recurring-expense',
      params: { userId, userName: params.userName || '' },
    });
  }, [userId, params.userName]);

  const persistAndNext = useCallback(
    async (items: RecurringTemplate[]) => {
      try {
        for (const item of items) {
          await createRecurringRule(userId, {
            type: 'in',
            title: item.title,
            amount: item.amount,
            category: item.category,
            cadence: item.cadence ?? 'month',
          });
        }
        await saveRecurringIncomeTemplates(userId, []);
      } catch {
        await saveRecurringIncomeTemplates(userId, items);
      }
      goExpense();
    },
    [userId, goExpense]
  );

  const skip = useCallback(async () => {
    try {
      await saveRecurringIncomeTemplates(userId, []);
    } catch {
      /* ignore */
    }
    goExpense();
  }, [userId, goExpense]);

  if (!userId) return null;

  return (
    <OnboardingRecurringSetup
      flow="income"
      categories={INCOME_CATEGORIES}
      defaultCategoryId={INCOME_CATEGORIES[0].id}
      titleHintKey="onboarding.hintIncomeTitle"
      onContinue={persistAndNext}
      onSkip={skip}
    />
  );
}
