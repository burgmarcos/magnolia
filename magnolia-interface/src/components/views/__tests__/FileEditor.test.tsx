import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { FileEditor } from '../FileEditor.tsx';
import { toast } from 'react-hot-toast';

// Mock Tauri dialog API
vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

// Mock Tauri core API
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return { invoke: mockInvoke, default: { invoke: mockInvoke } };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };
  return {
    default: mockToast,
    toast: mockToast,
  };
});

describe('FileEditor', () => {
  let saveMock: Mock;
  let invokeMock: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dialogApi = await import('@tauri-apps/plugin-dialog');
    saveMock = dialogApi.save as Mock;

    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const defaultProps = {
    filename: 'test.md',
    content: '# Hello World',
    onSave: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders the filename and standard buttons', async () => {
    await act(async () => {
      render(<FileEditor {...defaultProps} />);
    });

    expect(screen.getByText('test.md')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Save As')).toBeInTheDocument();
  });

  it('calls onSave when Save button is clicked', async () => {
    await act(async () => {
      render(<FileEditor {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(defaultProps.onSave).toHaveBeenCalledWith('# Hello World');
  });

  it('handles Save As failure gracefully', async () => {
    saveMock.mockRejectedValue(new Error('Dialog failed'));

    await act(async () => {
      render(<FileEditor {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save As'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Save As failed');
      expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('handles Save As success correctly', async () => {
    saveMock.mockResolvedValue('/path/to/test.md');
    invokeMock.mockResolvedValue(undefined);

    await act(async () => {
      render(<FileEditor {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save As'));
    });

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith({
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'txt']
        }]
      });
      expect(invokeMock).toHaveBeenCalledWith('write_text_file', {
        path: '/path/to/test.md',
        content: '# Hello World'
      });
      expect(toast.success).toHaveBeenCalledWith('File saved');
    });
  });
});
