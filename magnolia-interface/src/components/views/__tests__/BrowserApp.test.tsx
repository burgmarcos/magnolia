import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { BrowserApp } from '../BrowserApp';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return { invoke: mockInvoke, default: { invoke: mockInvoke } };
});

describe('BrowserApp', () => {
  let invokeMock: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    const tauriApi = await import('@tauri-apps/api/core');
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;
  });

  it('renders search engine selector on first load', async () => {
    await act(async () => {
      render(<BrowserApp />);
    });

    expect(screen.getByText('Choose your experience')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('DuckDuckGo')).toBeInTheDocument();
    expect(screen.getByText('Bing')).toBeInTheDocument();
  });

  it('selects search engine and hides selector', async () => {
    await act(async () => {
      render(<BrowserApp />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Google'));
    });

    expect(localStorage.getItem('Magnolia-search-engine')).toBe('google');

    // Use waitFor to handle AnimatePresence exit animations
    await waitFor(() => {
        expect(screen.queryByText('Choose your experience')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Enter a URL to access the Sovereign Webview')).toBeInTheDocument();
  });

  it('navigates to a URL', async () => {
    // Set search engine to bypass the selector
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    await act(async () => {
      render(<BrowserApp />);
    });

    const input = screen.getByPlaceholderText('Search or enter URL');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'example.com' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    const iframe = screen.getByTitle('Sovereign Browser Content');
    expect(iframe).toHaveAttribute('src', 'https://example.com/');
  });

  it('performs a search query using the selected engine', async () => {
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    await act(async () => {
      render(<BrowserApp />);
    });

    const input = screen.getByPlaceholderText('Search or enter URL');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'hello world' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    const iframe = screen.getByTitle('Sovereign Browser Content');
    expect(iframe).toHaveAttribute('src', 'https://duckduckgo.com/?q=hello%20world');
  });

  it('calls invoke when opening external URL', async () => {
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    await act(async () => {
      render(<BrowserApp initialUrl="https://example.com" />);
    });

    const button = screen.getByTitle('Open in System Browser');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(invokeMock).toHaveBeenCalledWith('open_external_url', { url: 'https://example.com' });
  });
});
