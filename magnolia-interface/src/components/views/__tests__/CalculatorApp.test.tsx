import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { CalculatorApp } from '../CalculatorApp.tsx';

// Mock framer-motion to avoid exit animations causing duplicate elements in the DOM
vi.mock('framer-motion', () => ({
  motion: {
    h1: ({ children, ...props }: unknown) => {
      // Remove animation props
      const typedProps = props as Record<string, unknown>;
      const { ...rest } = typedProps;
      delete rest.initial;
      delete rest.animate;
      delete rest.exit;
      return <h1 {...rest}>{children as React.ReactNode}</h1>;
    }
  }
}));

// Mock the CSS module
vi.mock('../CalculatorApp.module.css', () => ({
  default: {
    container: 'container',
    display: 'display',
    equation: 'equation',
    currentValue: 'currentValue',
    grid: 'grid',
    button: 'button',
    operator: 'operator',
    equal: 'equal',
    zero: 'zero'
  }
}));

vi.mock('lucide-react', () => ({
  Delete: () => <span data-testid="icon-delete">Delete</span>,
  Divide: () => <span data-testid="icon-divide">/</span>,
  Minus: () => <span data-testid="icon-minus">-</span>,
  Plus: () => <span data-testid="icon-plus">+</span>,
  X: () => <span data-testid="icon-x">*</span>,
  Equal: () => <span data-testid="icon-equal">=</span>,
}));

describe('CalculatorApp', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders initial state correctly', () => {
    render(<CalculatorApp />);
    expect(screen.getByRole('heading')).toHaveTextContent('0');
  });

  it('handles number inputs via clicking', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    expect(screen.getByRole('heading')).toHaveTextContent('12');
  });

  it('handles basic calculations', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByTestId('icon-plus'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByRole('heading')).toHaveTextContent('5');
  });

  it('handles AC (clear) button', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    expect(screen.getByRole('heading')).toHaveTextContent('5');

    fireEvent.click(screen.getByText('AC'));
    expect(screen.getByRole('heading')).toHaveTextContent('0');
  });

  it('handles backspace (delete) button', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('7'));
    fireEvent.click(screen.getByText('8'));
    expect(screen.getByRole('heading')).toHaveTextContent('78');

    fireEvent.click(screen.getByTestId('icon-delete'));
    expect(screen.getByRole('heading')).toHaveTextContent('7');
  });

  it('handles division and multiplication', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('0'));
    fireEvent.click(screen.getByTestId('icon-divide'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByRole('heading')).toHaveTextContent('5');

    fireEvent.click(screen.getByTestId('icon-x'));
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByRole('heading')).toHaveTextContent('20');
  });

  it('handles subtraction', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByTestId('icon-minus'));
    fireEvent.click(screen.getByText('8'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByRole('heading')).toHaveTextContent('7');
  });

  it('handles decimal points', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('.'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByTestId('icon-plus'));
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('.'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByRole('heading')).toHaveTextContent('4');
  });

  it('displays Error for invalid calculations', () => {
    render(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByTestId('icon-plus'));
    fireEvent.click(screen.getByText('.'));
    fireEvent.click(screen.getByTestId('icon-equal'));
    expect(screen.getByRole('heading')).toHaveTextContent('Error');
  });

  it('handles keyboard events', () => {
    render(<CalculatorApp />);

    // Fire events using fireEvent.keyDown on the window
    fireEvent.keyDown(window, { key: '9' });
    fireEvent.keyDown(window, { key: '+' });
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByRole('heading')).toHaveTextContent('10');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('heading')).toHaveTextContent('0');
  });
});
