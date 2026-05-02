import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TasksWidget } from '../TasksWidget';

vi.mock('../TasksWidget.module.css', () => ({
  default: {
    widgetContainer: 'widgetContainer',
    header: 'header',
    headerContent: 'headerContent',
    headline: 'headline',
    headerControls: 'headerControls',
    iconButtonError: 'iconButtonError',
    list: 'list',
    listItem: 'listItem',
    listIconContainer: 'listIconContainer',
    avatar: 'avatar',
    listText: 'listText',
    bodyLarge: 'bodyLarge',
    listTrailing: 'listTrailing',
    checkbox: 'checkbox',
    checkboxChecked: 'checkboxChecked',
    actions: 'actions',
    divider: 'divider',
    inputRow: 'inputRow',
    input: 'input',
    buttonsRow: 'buttonsRow',
    secondaryButton: 'secondaryButton',
    primaryButton: 'primaryButton',
  }
}));

describe('TasksWidget', () => {
  it('renders correctly with default tasks', () => {
    render(<TasksWidget />);

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Design System mapping')).toBeInTheDocument();
    expect(screen.getByText('Build XRAppBar')).toBeInTheDocument();
    expect(screen.getByText('Translate to Tailwind/CSS')).toBeInTheDocument();
    expect(screen.getByText('Tasks Widget State')).toBeInTheDocument();
    expect(screen.getByText('App Windows Layout')).toBeInTheDocument();
  });

  it('adds a new task', () => {
    render(<TasksWidget />);

    const input = screen.getByPlaceholderText('New task...');
    fireEvent.change(input, { target: { value: 'New Test Task' } });

    const addButton = screen.getByRole('button', { name: /Add todo/i });
    fireEvent.click(addButton);

    expect(screen.getByText('New Test Task')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('adds a new task by pressing Enter', () => {
    render(<TasksWidget />);

    const input = screen.getByPlaceholderText('New task...');
    fireEvent.change(input, { target: { value: 'Another Test Task' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('Another Test Task')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('does not add empty tasks', () => {
    render(<TasksWidget />);

    // Default 5 tasks
    const initialTasksLength = screen.getAllByText('A').length;

    const input = screen.getByPlaceholderText('New task...');
    fireEvent.change(input, { target: { value: '   ' } });

    const addButton = screen.getByRole('button', { name: /Add todo/i });
    fireEvent.click(addButton);

    expect(screen.getAllByText('A').length).toBe(initialTasksLength);
  });

  it('toggles task completion status on click', () => {
    render(<TasksWidget />);

    // Find a task that is initially incomplete
    const taskItem = screen.getByText('Translate to Tailwind/CSS').closest('.listItem');
    expect(taskItem).toBeInTheDocument();

    // Assuming incomplete doesn't have the checkboxChecked class
    let checkbox = taskItem?.querySelector('.checkbox');
    expect(checkbox).not.toHaveClass('checkboxChecked');

    // Click it to complete
    fireEvent.click(taskItem!);

    checkbox = taskItem?.querySelector('.checkbox');
    expect(checkbox).toHaveClass('checkboxChecked');
  });

  it('clears all tasks', () => {
    render(<TasksWidget />);

    // Initial tasks should be present
    expect(screen.getByText('Design System mapping')).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearButton);

    // Tasks should be gone
    expect(screen.queryByText('Design System mapping')).not.toBeInTheDocument();

    // Avatar shouldn't be present
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });
});
