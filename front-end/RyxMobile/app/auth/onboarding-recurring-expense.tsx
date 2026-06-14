import { useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { OnboardingRecurringSetup } from '../../components/OnboardingRecurringSetup';
import { EXPENSE_CATEGORIES } from '../../services/expenses';
import { createRecurringRule } from '../../services/recurring';
import { saveRecurringExpenseTemplates, type RecurringTemplate } from '../../services/recurringTemplatesStorage';

export default function OnboardingRecurringExpenseScreen() {
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const userId = params.userId || '';

  useEffect(() => {
    if (!userId) {
      router.replace('/auth/register');
    }
  }, [userId]);

  const goWelcome = useCallback(() => {
    router.replace({
      pathname: '/auth/bienvenue-inscription',
      params: { userId, userName: params.userName || '' },
    });
  }, [userId, params.userName]);

  const persistAndFinish = useCallback(
    async (items: RecurringTemplate[]) => {
      try {
        for (const item of items) {
          await createRecurringRule(userId, {
            type: 'out',
            title: item.title,
            amount: item.amount,
            category: item.category,
            cadence: item.cadence ?? 'month',
          });
        }
        await saveRecurringExpenseTemplates(userId, []);
      } catch {
        await saveRecurringExpenseTemplates(userId, items);
      }
      goWelcome();
    },
    [userId, goWelcome]
  );

  const skip = useCallback(async () => {
    try {
      await saveRecurringExpenseTemplates(userId, []);
    } catch {
      /* ignore */
    }
    goWelcome();
  }, [userId, goWelcome]);

  if (!userId) return null;

  return (
    <OnboardingRecurringSetup
      flow="expense"
      categories={EXPENSE_CATEGORIES}
      defaultCategoryId={EXPENSE_CATEGORIES[0].id}
      titleHintKey="onboarding.hintExpenseTitle"
      onContinue={persistAndFinish}
      onSkip={skip}
    />
  );
}
