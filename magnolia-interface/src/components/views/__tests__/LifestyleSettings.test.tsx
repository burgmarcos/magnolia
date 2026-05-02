import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Mock } from 'vitest';
import { LifestyleSettings } from '../LifestyleSettings';

// Mock Language Context
const { mockTranslate } = vi.hoisted(() => ({
  mockTranslate: vi.fn((key: string) => key),
}));

vi.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({ translate: mockTranslate })
}));

// Mock Tauri invoke
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  __esModule: true,
  invoke: mockInvoke,
  default: { invoke: mockInvoke }
}));

// Mock CSS Module
vi.mock('../GeneralSettings.module.css', () => ({
  default: { container: 'container' }
}));

describe('LifestyleSettings', () => {
  let invokeMock: Mock;

  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    vi.clearAllMocks();
    invokeMock = mockInvoke as unknown as Mock;
    mockTranslate.mockClear();
  });

  it('renders lifestyle settings and calculates total time correctly', async () => {
    // Return data to give 2h 30m total time
    invokeMock.mockResolvedValue([
      { app_id: 'Browser', total_minutes: 150 }
    ]);

    await act(async () => {
      render(<LifestyleSettings />);
    });

    await waitFor(() => {
      expect(screen.getByText('2h 30m')).toBeInTheDocument();
      expect(screen.getByText('Browser')).toBeInTheDocument();
      expect(screen.getByText('150 mins')).toBeInTheDocument();
    });
  });

  it('handles empty stats gracefully', async () => {
    invokeMock.mockResolvedValue([]);

    await act(async () => {
      render(<LifestyleSettings />);
    });

    await waitFor(() => {
      expect(screen.getByText('0h 0m')).toBeInTheDocument();
    });
  });

  it('toggles intrusive break warnings state', async () => {
    invokeMock.mockResolvedValue([]);

    await act(async () => {
      render(<LifestyleSettings />);
    });

    // Default state should be ACTIVE
    const toggleButton = screen.getByText('ACTIVE');
    expect(toggleButton).toBeInTheDocument();

    // Click to toggle to OFF
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(screen.getByText('OFF')).toBeInTheDocument();
    });
  });

  it('renders correctly on invoke error', async () => {
    invokeMock.mockRejectedValue(new Error('Failed to load stats'));

    await act(async () => {
      render(<LifestyleSettings />);
    });

    await waitFor(() => {
      expect(screen.getByText('0h 0m')).toBeInTheDocument();
    });
    expect(console.error).toHaveBeenCalled();
  });
});
