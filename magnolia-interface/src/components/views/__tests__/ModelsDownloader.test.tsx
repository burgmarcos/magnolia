import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return { invoke: mockInvoke, default: { invoke: mockInvoke }, __esModule: true };
});

// We must also mock react-hot-toast otherwise it might complain
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('ModelsDownloader', () => {
  let invokeMock: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;

    // Default mock implementation for mount
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_all_local_models_info') return Promise.resolve([{ name: 'model1.gguf', size_bytes: 4000, fit_status: 'Fits Perfectly' }]);
      if (cmd === 'get_local_models') return Promise.resolve(['model1.gguf']);
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });
  });

  it('renders correctly and loads initial local models', async () => {
    render(<ModelsDownloader />);

    expect(screen.getByText('Models')).toBeInTheDocument();

    // Wait for the local models to load
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });
  });
});
