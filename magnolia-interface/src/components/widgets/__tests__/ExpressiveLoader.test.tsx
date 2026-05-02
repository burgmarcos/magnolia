import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExpressiveLoader } from '../ExpressiveLoader';

describe('ExpressiveLoader', () => {
  it('renders successfully with default props', () => {
    const { container } = render(<ExpressiveLoader />);

    // Check if the container div has default size
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle({ width: '48px', height: '48px' });

    // Check if SVG is rendered with default size
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');

    // Check if path is rendered with default color
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('fill', 'var(--schemes-primary)');
  });

  it('renders with custom size and color', () => {
    const { container } = render(<ExpressiveLoader size={100} color="red" />);

    // Check if the container div has custom size
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle({ width: '100px', height: '100px' });

    // Check if SVG is rendered with custom size
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '100');

    // Check if path is rendered with custom color
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('fill', 'red');
  });

  it('contains the morphing path', () => {
    const { container } = render(<ExpressiveLoader />);

    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    // Verify it starts with the first shape (Circle)
    expect(path).toHaveAttribute('d', 'M 50 10 A 40 40 0 1 1 50 90 A 40 40 0 1 1 50 10');
  });
});
