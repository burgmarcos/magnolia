import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CalendarApp } from '../CalendarApp';

describe('CalendarApp', () => {
  it('renders correctly with default month view', () => {
    render(<CalendarApp />);

    // Navigation buttons check
    expect(screen.getByText('Today')).toBeInTheDocument();

    // View toggles check
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument();

    // Sidebar create button
    expect(screen.getByText('Create')).toBeInTheDocument();

    // Default events
    expect(screen.getByText('Deployment')).toBeInTheDocument();
    expect(screen.getByText('OS Hardening')).toBeInTheDocument();
  });

  it('can switch views', async () => {
    render(<CalendarApp />);

    const weekBtn = screen.getByRole('button', { name: 'Week' });

    await act(async () => {
      fireEvent.click(weekBtn);
    });

    expect(screen.getByText('View Optimization in Progress')).toBeInTheDocument();
  });

  it('can create a new event', async () => {
    render(<CalendarApp />);

    const createBtn = screen.getByText('Create');

    await act(async () => {
      fireEvent.click(createBtn);
    });

    // Modal should appear
    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New Event')).toBeInTheDocument();

    // Change title
    const input = screen.getByDisplayValue('New Event');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'My Custom Event' } });
    });

    // Save
    const saveBtn = screen.getByText('Save Changes');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Should be in list
    expect(screen.getByText('My Custom Event')).toBeInTheDocument();
    expect(screen.queryByText('Edit Event')).not.toBeInTheDocument();
  });

  it('can delete an event', async () => {
    render(<CalendarApp />);

    const eventEl = screen.getByText('Deployment');

    await act(async () => {
      fireEvent.click(eventEl);
    });

    const deleteBtn = screen.getByText('Delete');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(screen.queryByText('Deployment')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Event')).not.toBeInTheDocument();
  });
});
