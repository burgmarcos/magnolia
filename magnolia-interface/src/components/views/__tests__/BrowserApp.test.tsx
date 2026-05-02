import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial about:blank state correctly when configured', () => {
    // We expect the search engine selector not to show if already configured
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

    render(<BrowserApp />);
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

    // Go back
    const backBtn = screen.getByTitle('Go Back');
    fireEvent.click(backBtn);
    expect(input).toHaveValue('https://example.com/');

    // Go forward
    const forwardBtn = screen.getByTitle('Go Forward');
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
    const reloadBtn = screen.getByTitle('Reload');

    fireEvent.click(reloadBtn);

    // Check if loading state is applied (the lucide icon gets an 'animate-spin' class)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    act(() => {
        vi.advanceTimersByTime(500);
    });

    // Check if loading state is removed
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('handles home button correctly', () => {
    localStorage.setItem('Magnolia-search-engine', 'duckduckgo');

    render(<BrowserApp />);
    const input = screen.getByPlaceholderText('Search or enter URL');

    // Go to first site
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input).toHaveValue('https://example.com/');

    const homeBtn = screen.getByTitle('Home');
    fireEvent.click(homeBtn);

    expect(input).toHaveValue('');
    expect(screen.getByText('Enter a URL to access the Sovereign Webview')).toBeInTheDocument();
  });
});
