import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TasksWidget } from '../TasksWidget';

vi.mock('../TasksWidget.module.css', () => ({
  default: new Proxy({}, {
    get: function(_target, prop) {
      return prop;
    }
  })
}));

describe('TasksWidget', () => {
  it('renders default tasks correctly', () => {
    render(<TasksWidget />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Design System mapping')).toBeInTheDocument();
    expect(screen.getByText('App Windows Layout')).toBeInTheDocument();
  });

  it('can add a new task via button', () => {
    render(<TasksWidget />);
    const input = screen.getByPlaceholderText('New task...');
    const addButton = screen.getByText('Add todo');

    fireEvent.change(input, { target: { value: 'My new task' } });
    fireEvent.click(addButton);

    expect(screen.getByText('My new task')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('can add a new task via Enter key', () => {
    render(<TasksWidget />);
    const input = screen.getByPlaceholderText('New task...');

    fireEvent.change(input, { target: { value: 'Another new task' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('Another new task')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('does not add empty tasks', () => {
    render(<TasksWidget />);

    // Clear all first to easily count tasks
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Ensure no tasks
    expect(screen.queryByText('Design System mapping')).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText('New task...');
    const addButton = screen.getByText('Add todo');

    // Try to add empty
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(addButton);

    // List should still be empty
    expect(input).toHaveValue('   ');

    // Try adding empty string
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(addButton);

    // Still shouldn't have been added
    expect(input).toHaveValue('');
  });

  it('can clear all tasks', () => {
    render(<TasksWidget />);
    const clearButton = screen.getByText('Clear');

    // Initially has default tasks
    expect(screen.getByText('Design System mapping')).toBeInTheDocument();

    fireEvent.click(clearButton);

    // Should be cleared
    expect(screen.queryByText('Design System mapping')).not.toBeInTheDocument();
  });

  it('can toggle a task status', () => {
    render(<TasksWidget />);
    // "Translate to Tailwind/CSS" is incomplete by default
    const taskItemText = screen.getByText('Translate to Tailwind/CSS');

    // The closest list item or the icon container
    const taskListItem = taskItemText.closest('.listItem');
    expect(taskListItem).toBeInTheDocument();

    // Check it does not have the checkboxChecked class
    const checkbox = taskListItem!.querySelector('.checkbox');
    expect(checkbox).not.toHaveClass('checkboxChecked');

    // Click to toggle
    fireEvent.click(taskListItem!);

    // Now it should have the checked class
    expect(checkbox).toHaveClass('checkboxChecked');
  });
});
