import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CalculatorApp } from '../CalculatorApp';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    h1: ({ children, className }: { children: React.ReactNode, className?: string }) => <h1 className={className} data-testid="display">{children}</h1>,
  },
}));

// Mock lucide-react icons so we can easily find operator buttons by test ID
vi.mock('lucide-react', () => ({
  Delete: () => <span data-testid="icon-delete">Delete</span>,
  Divide: () => <span data-testid="icon-divide">Divide</span>,
  Minus: () => <span data-testid="icon-minus">Minus</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  X: () => <span data-testid="icon-multiply">Multiply</span>,
  Equal: () => <span data-testid="icon-equal">Equal</span>,
}));

describe('CalculatorApp', () => {
  it('renders initial state', () => {
    render(<CalculatorApp />);
    expect(screen.getByTestId('display')).toHaveTextContent('0');
  });

  it('handles basic number input', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    expect(screen.getByTestId('display')).toHaveTextContent('123');
  });

  it('handles basic addition', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByTestId('icon-plus'));
    fireEvent.click(screen.getByText('7'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByTestId('display')).toHaveTextContent('12');
  });

  it('handles basic subtraction', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('0'));
    fireEvent.click(screen.getByTestId('icon-minus'));
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByTestId('display')).toHaveTextContent('6');
  });

  it('handles basic multiplication', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByTestId('icon-multiply'));
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByTestId('display')).toHaveTextContent('12');
  });

  it('handles basic division', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('0'));
    fireEvent.click(screen.getByTestId('icon-divide'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByTestId('display')).toHaveTextContent('4');
  });

  it('handles AC (All Clear)', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    expect(screen.getByTestId('display')).toHaveTextContent('12');
    fireEvent.click(screen.getByText('AC'));
    expect(screen.getByTestId('display')).toHaveTextContent('0');
  });

  it('handles delete (backspace)', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    expect(screen.getByTestId('display')).toHaveTextContent('123');
    fireEvent.click(screen.getByTestId('icon-delete'));
    expect(screen.getByTestId('display')).toHaveTextContent('12');
    fireEvent.click(screen.getByTestId('icon-delete'));
    fireEvent.click(screen.getByTestId('icon-delete'));
    expect(screen.getByTestId('display')).toHaveTextContent('0');
  });

  it('handles decimal input', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('.'));
    fireEvent.click(screen.getByText('5'));
    expect(screen.getByTestId('display')).toHaveTextContent('1.5');
    fireEvent.click(screen.getByTestId('icon-plus'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('.'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByTestId('display')).toHaveTextContent('4');
  });

  it('handles keyboard input', () => {
    render(<CalculatorApp />);

    // Simulate typing "2 * 3 = "
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: '*' });
    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByTestId('display')).toHaveTextContent('6');
  });

  it('handles error state for invalid equations', () => {
    render(<CalculatorApp />);
    // Just trigger calculate on invalid equation, for example "+ ="
    // Since display is "0" by default, clicking "+" gives "0 + "
    // clicking "=" with display "0" evaluates "0 + 0" = 0.

    // Let's create an invalid equation that throws an error in `new Function`
    // "1 . . 5 =" might be invalid js code
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '.' });
    fireEvent.keyDown(window, { key: '.' }); // two dots makes invalid float
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByTestId('display')).toHaveTextContent('Error');
  });
});
