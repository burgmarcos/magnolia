import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppWindow } from '../AppWindow';

// Mock CSS modules
vi.mock('../AppWindow.module.css', () => ({
  default: {
    appWindow: 'appWindow',
    maximized: 'maximized',
    appBar: 'appBar',
    titleText: 'titleText',
    controlsLeft: 'controlsLeft',
    controlsRight: 'controlsRight',
    iconButton: 'iconButton',
    closeButton: 'closeButton',
    iconContainerBg: 'iconContainerBg',
    body: 'body',
    resizeHandle: 'resizeHandle'
  }
}));

describe('AppWindow Component', () => {
  it('renders the window with the correct title and children', async () => {
    await act(async () => {
      render(
        <AppWindow title="Test Window">
          <div data-testid="test-child">Child Content</div>
        </AppWindow>
      );
    });

    expect(screen.getByText('Test Window')).toBeInTheDocument();
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();

    await act(async () => {
      render(
        <AppWindow title="Test Window" onClose={handleClose}>
          Content
        </AppWindow>
      );
    });

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onMinimize when minimize button is clicked', async () => {
    const handleMinimize = vi.fn();

    await act(async () => {
      render(
        <AppWindow title="Test Window" onMinimize={handleMinimize}>
          Content
        </AppWindow>
      );
    });

    const minimizeButton = screen.getByLabelText('Minimize');
    fireEvent.click(minimizeButton);
    expect(handleMinimize).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is clicked', async () => {
    const handleBack = vi.fn();

    const { container } = render(
      <AppWindow title="Test Window" onBack={handleBack}>
        Content
      </AppWindow>
    );

    const backButtonDiv = container.querySelector('.iconContainerBg');
    expect(backButtonDiv).toBeInTheDocument();
    fireEvent.click(backButtonDiv!);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
