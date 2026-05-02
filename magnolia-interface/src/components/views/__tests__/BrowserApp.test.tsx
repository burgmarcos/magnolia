import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserApp } from '../BrowserApp';
import * as tauriApiCore from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return { invoke: mockInvoke, default: { invoke: mockInvoke } };
});

describe('BrowserApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders initial about:blank state correctly', () => {
    // We expect the search engine selector first if not configured
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    render(<BrowserApp />);

    expect(screen.getByPlaceholderText('Search or enter URL')).toHaveValue('');
    expect(screen.getByText('Enter a URL to access the Sovereign Webview')).toBeInTheDocument();
  });

  it('renders search engine selector if not configured', () => {
    render(<BrowserApp />);

    expect(screen.getByText('Choose your experience')).toBeInTheDocument();
    expect(screen.getByText('DuckDuckGo')).toBeInTheDocument();
  });

  it('navigates to url when submitted', () => {
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    render(<BrowserApp />);

    const input = screen.getByPlaceholderText('Search or enter URL');
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(input).toHaveValue('https://example.com/');
  });

  it('sets correct search engine and navigates', () => {
    render(<BrowserApp />);

    // Choose DuckDuckGo
    const duckduckgoBtn = screen.getByText('DuckDuckGo');
    fireEvent.click(duckduckgoBtn);

    expect(localStorage.getItem('Magnolia-search-engine')).toBe('duckduckgo');

    const input = screen.getByPlaceholderText('Search or enter URL');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(input).toHaveValue('https://duckduckgo.com/?q=test%20query');
  });

  it('handles navigation history back and forward', () => {
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    const { container } = render(<BrowserApp />);
    const input = screen.getByPlaceholderText('Search or enter URL');

    // Initial state is about:blank, but history only includes successful safe navigations

    // Go to first site
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input).toHaveValue('https://example.com/');

    // Go to second site
    fireEvent.change(input, { target: { value: 'test.com' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input).toHaveValue('https://test.com/');

    // The buttons don't have good a11y labels, so we select them by order in the DOM
    const buttons = container.querySelectorAll('button');
    const backBtn = buttons[0];
    const forwardBtn = buttons[1];

    // Go back
    fireEvent.click(backBtn);
    expect(input).toHaveValue('https://example.com/');

    // Go forward
    fireEvent.click(forwardBtn);
    expect(input).toHaveValue('https://test.com/');
  });

  it('calls open_external_url via invoke when external browser button clicked', () => {
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');
    render(<BrowserApp initialUrl="https://example.com" />);

    const externalBrowserBtn = screen.getByTitle('Open in System Browser');
    fireEvent.click(externalBrowserBtn);

    expect(tauriApiCore.invoke).toHaveBeenCalledWith('open_external_url', { url: 'https://example.com' });
  });

  it('handles reload button correctly', () => {
    vi.useFakeTimers();
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    const { container } = render(<BrowserApp />);
    const buttons = container.querySelectorAll('button');
    // reload button is the 4th button in the toolbar
    const reloadBtn = buttons[3];

    fireEvent.click(reloadBtn);

    // Check if loading state is applied (the lucide icon gets an 'animate-spin' class)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    act(() => {
        vi.advanceTimersByTime(500);
    });

    // Check if loading state is removed
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('handles home button correctly', () => {
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    const { container } = render(<BrowserApp />);
    const input = screen.getByPlaceholderText('Search or enter URL');

    // Go to first site
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input).toHaveValue('https://example.com/');

    const buttons = container.querySelectorAll('button');
    // home button is the 5th button in the toolbar
    const homeBtn = buttons[4];

    fireEvent.click(homeBtn);

    expect(input).toHaveValue('');
    expect(screen.getByText('Enter a URL to access the Sovereign Webview')).toBeInTheDocument();
  });
});
