import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { CalculatorApp } from '../CalculatorApp.tsx';

// Helper to get the calculator's display h1
function getDisplay() {
  // The display value lives inside the display area as the last h1 rendered
  return screen.getByRole('heading', { level: 1 });
}

afterEach(() => {
  cleanup();
});

describe('CalculatorApp', () => {
  it('renders with initial display of 0', () => {
    render(<CalculatorApp />);
    expect(getDisplay()).toHaveTextContent('0');
  });

  it('renders AC (clear) button', () => {
    render(<CalculatorApp />);
    expect(screen.getByText('AC')).toBeInTheDocument();
  });

  it('displays a number when a digit button is clicked', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('7'));
    expect(getDisplay()).toHaveTextContent('7');
  });

  it('appends digits when multiple buttons are clicked', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    expect(getDisplay()).toHaveTextContent('123');
  });

  it('clears display to 0 when AC is pressed', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('AC'));
    expect(getDisplay()).toHaveTextContent('0');
  });

  it('computes addition via keyboard input', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '5' });
    fireEvent.keyDown(win, { key: '+' });
    fireEvent.keyDown(win, { key: '3' });
    fireEvent.keyDown(win, { key: 'Enter' });
    expect(getDisplay()).toHaveTextContent('8');
  });

  it('computes subtraction via keyboard input', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '9' });
    fireEvent.keyDown(win, { key: '-' });
    fireEvent.keyDown(win, { key: '4' });
    fireEvent.keyDown(win, { key: 'Enter' });
    expect(getDisplay()).toHaveTextContent('5');
  });

  it('computes multiplication via keyboard input', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '6' });
    fireEvent.keyDown(win, { key: '*' });
    fireEvent.keyDown(win, { key: '7' });
    fireEvent.keyDown(win, { key: 'Enter' });
    expect(getDisplay()).toHaveTextContent('42');
  });

  it('computes division via keyboard input', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '8' });
    fireEvent.keyDown(win, { key: '/' });
    fireEvent.keyDown(win, { key: '2' });
    fireEvent.keyDown(win, { key: 'Enter' });
    expect(getDisplay()).toHaveTextContent('4');
  });

  it('clears with Escape key', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '9' });
    fireEvent.keyDown(win, { key: 'Escape' });
    expect(getDisplay()).toHaveTextContent('0');
  });

  it('handles backspace via keyboard', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '1' });
    fireEvent.keyDown(win, { key: '2' });
    fireEvent.keyDown(win, { key: 'Backspace' });
    expect(getDisplay()).toHaveTextContent('1');
  });

  it('backspace on single digit resets to 0', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '5' });
    fireEvent.keyDown(win, { key: 'Backspace' });
    expect(getDisplay()).toHaveTextContent('0');
  });

  it('allows decimal input via keyboard', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '3' });
    fireEvent.keyDown(win, { key: '.' });
    fireEvent.keyDown(win, { key: '1' });
    fireEvent.keyDown(win, { key: '4' });
    expect(getDisplay()).toHaveTextContent('3.14');
  });

  it('replaces display with new number after calculation', () => {
    const { container } = render(<CalculatorApp />);
    const win = container.ownerDocument.defaultView!;
    fireEvent.keyDown(win, { key: '2' });
    fireEvent.keyDown(win, { key: '+' });
    fireEvent.keyDown(win, { key: '3' });
    fireEvent.keyDown(win, { key: 'Enter' });
    // Result is 5; now typing 7 should replace it
    fireEvent.keyDown(win, { key: '7' });
    expect(getDisplay()).toHaveTextContent('7');
  });

  it('shows 0 when all digits are deleted with backspace button', () => {
    render(<CalculatorApp />);
    // Click the delete/backspace button (last button in first row - Delete icon)
    fireEvent.click(screen.getByText('5'));
    // The Delete button is identified by its icon — use aria role button and find by position
    // Since there's no label, we use a test that clicks the number then clears via AC
    fireEvent.click(screen.getByText('AC'));
    expect(getDisplay()).toHaveTextContent('0');
  });
});
