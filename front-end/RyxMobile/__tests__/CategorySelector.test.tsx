import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategorySelector } from '../components/depenses/CategorySelector';

jest.mock('../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    ui: { textSecondary: '#666' },
    colors: { white: '#fff' },
  }),
}));

jest.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockCategories = [
  { id: '1', icon: 'restaurant', labelKey: 'food' },
  { id: '2', icon: 'car', labelKey: 'transport' },
] as const;

const mockStyles = {
  categoryGrid: {},
  categoryChip: {},
  categoryChipActive: {},
  categoryChipText: {},
  categoryChipTextActive: {},
} as any;

describe('CategorySelector Component', () => {
  it('renders all categories correctly', () => {
    const { getByText } = render(
      <CategorySelector
        categories={mockCategories}
        selectedCategoryId="1"
        onSelectCategory={() => {}}
        submitting={false}
        styles={mockStyles}
      />
    );

    expect(getByText('food')).toBeTruthy();
    expect(getByText('transport')).toBeTruthy();
  });

  it('calls onSelectCategory when a chip is pressed', () => {
    const handleSelectCategory = jest.fn();
    const { getByText } = render(
      <CategorySelector
        categories={mockCategories}
        selectedCategoryId="1"
        onSelectCategory={handleSelectCategory}
        submitting={false}
        styles={mockStyles}
      />
    );

    fireEvent.press(getByText('transport'));
    expect(handleSelectCategory).toHaveBeenCalledWith('2');
  });

  it('does not call onSelectCategory when submitting', () => {
    const handleSelectCategory = jest.fn();
    const { getByText } = render(
      <CategorySelector
        categories={mockCategories}
        selectedCategoryId="1"
        onSelectCategory={handleSelectCategory}
        submitting={true}
        styles={mockStyles}
      />
    );

    fireEvent.press(getByText('transport'));
    expect(handleSelectCategory).not.toHaveBeenCalled();
  });
});
