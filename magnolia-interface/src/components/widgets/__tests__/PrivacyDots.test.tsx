import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrivacyDots } from '../PrivacyDots';

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({
  __esModule: true,
  invoke: mockInvoke,
  default: { invoke: mockInvoke }
}));

vi.mock('../PrivacyDots.module.css', () => ({
  default: {
    container: 'container',
    dotsWrapper: 'dotsWrapper',
    dotRed: 'dotRed',
    dotGreen: 'dotGreen',
    pill: 'pill',
    pillHeader: 'pillHeader',
    entryList: 'entryList',
    entry: 'entry',
    appName: 'appName',
    iconRed: 'iconRed',
    iconGreen: 'iconGreen',
    divider: 'divider'
  }
}));

describe('PrivacyDots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders nothing when no hardware is active', async () => {
    mockInvoke.mockResolvedValue([]);
    const { container } = render(<PrivacyDots />);

    expect(container).toBeEmptyDOMElement();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a red dot for active camera', async () => {
    mockInvoke.mockResolvedValue([{ app_id: 'com.test.camera', hardware_type: 'camera' }]);

    const { container } = render(<PrivacyDots />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(container.querySelector('.dotRed')).toBeInTheDocument();
    expect(container.querySelector('.dotGreen')).not.toBeInTheDocument();
  });

  it('renders a green dot for active microphone', async () => {
    mockInvoke.mockResolvedValue([{ app_id: 'com.test.mic', hardware_type: 'microphone' }]);

    const { container } = render(<PrivacyDots />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(container.querySelector('.dotGreen')).toBeInTheDocument();
    expect(container.querySelector('.dotRed')).not.toBeInTheDocument();
  });

  it('renders both dots for active camera and microphone', async () => {
    mockInvoke.mockResolvedValue([
      { app_id: 'com.test.camera', hardware_type: 'camera' },
      { app_id: 'com.test.mic', hardware_type: 'microphone' }
    ]);

    const { container } = render(<PrivacyDots />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(container.querySelector('.dotRed')).toBeInTheDocument();
    expect(container.querySelector('.dotGreen')).toBeInTheDocument();
  });

  it('displays a pill with app details on hover', async () => {
    mockInvoke.mockResolvedValue([
      { app_id: 'com.example.app1', hardware_type: 'camera' },
      { app_id: 'com.example.app2', hardware_type: 'microphone' }
    ]);

    const { container } = render(<PrivacyDots />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    const wrapper = container.querySelector('.container') as HTMLElement;
    expect(wrapper).toBeInTheDocument();

    expect(screen.queryByText('Active Hardware')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.mouseEnter(wrapper);
    });

    expect(screen.getByText('Active Hardware')).toBeInTheDocument();
    expect(screen.getByText('com.example.app1')).toBeInTheDocument();
    expect(screen.getByText('com.example.app2')).toBeInTheDocument();

    await act(async () => {
      fireEvent.mouseLeave(wrapper);
    });

    // The component uses AnimatePresence which might cause the waitFor to timeout with fake timers
    // Advance timers so framer-motion completes the animation
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Active Hardware')).not.toBeInTheDocument();
  });

  it('handles invoke errors gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('invoke error'));

    const { container } = render(<PrivacyDots />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(console.error).toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
