import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { FileEditor } from '../FileEditor.tsx';

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn()
}));

const { mockSave } = vi.hoisted(() => ({
  mockSave: vi.fn()
}));

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => ({
  __esModule: true,
  invoke: mockInvoke,
  default: { invoke: mockInvoke }
}));

// Mock the Tauri dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
  __esModule: true,
  save: mockSave
}));

const { mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => {
  const toastMock = {
    success: mockToastSuccess,
    error: mockToastError,
  };
  return {
    default: toastMock,
    toast: toastMock,
  };
});

// Mock codemirror to avoid JSDOM compatibility issues with layout/ranges
vi.mock('codemirror', () => {
  return {
    EditorView: class {
      static theme() { return {}; }
      state = { doc: { toString: () => 'mock content' } };
      destroy = vi.fn();
      constructor() {}
    },
    basicSetup: []
  };
});

vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn()
  }
}));

vi.mock('@codemirror/lang-markdown', () => ({
  markdown: vi.fn()
}));

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {}
}));

describe('FileEditor', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with filename', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      render(<FileEditor filename="test.md" content="Hello World" onSave={onSave} onClose={onClose} />);
    });

    expect(screen.getByText('test.md')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Save As')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      render(<FileEditor filename="test.md" content="Hello World" onSave={onSave} onClose={onClose} />);
    });

    // Find the close button by looking for the one with no text but with an icon
    const closeButton = screen.getByRole('button', { name: '' });

    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSave with editor content when Save is clicked', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      render(<FileEditor filename="test.md" content="Hello World" onSave={onSave} onClose={onClose} />);
    });

    const saveButton = screen.getByText('Save');

    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(onSave).toHaveBeenCalledWith('mock content');
  });

  it('handles Save As correctly when path is selected', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    // Mock save dialog returning a path
    mockSave.mockResolvedValue('/path/to/save/test.md');
    // Mock invoke returning success
    mockInvoke.mockResolvedValue(undefined);

    await act(async () => {
      render(<FileEditor filename="test.md" content="Hello World" onSave={onSave} onClose={onClose} />);
    });

    const saveAsButton = screen.getByText('Save As');

    await act(async () => {
      fireEvent.click(saveAsButton);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'txt']
        }]
      });
      expect(mockInvoke).toHaveBeenCalledWith('write_text_file', {
        path: '/path/to/save/test.md',
        content: 'mock content'
      });
      expect(mockToastSuccess).toHaveBeenCalledWith('File saved');
    });
  });

  it('handles Save As correctly when user cancels dialog', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    // Mock save dialog returning null (user cancelled)
    mockSave.mockResolvedValue(null);

    await act(async () => {
      render(<FileEditor filename="test.md" content="Hello World" onSave={onSave} onClose={onClose} />);
    });

    const saveAsButton = screen.getByText('Save As');

    await act(async () => {
      fireEvent.click(saveAsButton);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(mockToastSuccess).not.toHaveBeenCalled();
      expect(mockToastError).not.toHaveBeenCalled();
    });
  });

  it('handles Save As correctly when an error occurs', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    // Mock save dialog throwing an error
    mockSave.mockRejectedValue(new Error('Permission denied'));

    await act(async () => {
      render(<FileEditor filename="test.md" content="Hello World" onSave={onSave} onClose={onClose} />);
    });

    const saveAsButton = screen.getByText('Save As');

    await act(async () => {
      fireEvent.click(saveAsButton);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith('Save As failed');
    });
  });
});
