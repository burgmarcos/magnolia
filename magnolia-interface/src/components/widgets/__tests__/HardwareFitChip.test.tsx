import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HardwareFitChip } from '../HardwareFitChip';

// We mock the CSS module import to return identity strings so we can test the classNames
// exactly as they are applied via the styles object in the component.
vi.mock('../HardwareFitChip.module.css', () => ({
  default: {
    chipBase: 'chipBase',
    chipPerfect: 'chipPerfect',
    chipOffload: 'chipOffload',
    chipCannotRun: 'chipCannotRun',
    iconWrapper: 'iconWrapper',
    chipText: 'chipText'
  }
}));

describe('HardwareFitChip', () => {
  it('renders correctly for perfect fitState', () => {
    const { container } = render(<HardwareFitChip fitState="perfect" />);
    expect(screen.getByText('Fits Perfectly')).toBeInTheDocument();

    const chipBase = container.firstChild as HTMLElement;
    expect(chipBase).toHaveClass('chipBase');
    expect(chipBase).toHaveClass('chipPerfect');
  });

  it('renders correctly for offload fitState', () => {
    const { container } = render(<HardwareFitChip fitState="offload" />);
    expect(screen.getByText('Needs Offload')).toBeInTheDocument();

    const chipBase = container.firstChild as HTMLElement;
    expect(chipBase).toHaveClass('chipBase');
    expect(chipBase).toHaveClass('chipOffload');
  });

  it('renders correctly for cannot-run fitState', () => {
    const { container } = render(<HardwareFitChip fitState="cannot-run" />);
    expect(screen.getByText('Does Not Run')).toBeInTheDocument();

    const chipBase = container.firstChild as HTMLElement;
    expect(chipBase).toHaveClass('chipBase');
    expect(chipBase).toHaveClass('chipCannotRun');
  });

  it('renders custom label when provided', () => {
    render(<HardwareFitChip fitState="perfect" label="Custom Label" />);
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
    expect(screen.queryByText('Fits Perfectly')).not.toBeInTheDocument();
  });

  it('renders custom label when provided for offload state', () => {
    render(<HardwareFitChip fitState="offload" label="Custom Offload Label" />);
    expect(screen.getByText('Custom Offload Label')).toBeInTheDocument();
    expect(screen.queryByText('Needs Offload')).not.toBeInTheDocument();
  });

  it('renders custom label when provided for cannot-run state', () => {
    render(<HardwareFitChip fitState="cannot-run" label="Custom Cannot Run Label" />);
    expect(screen.getByText('Custom Cannot Run Label')).toBeInTheDocument();
    expect(screen.queryByText('Does Not Run')).not.toBeInTheDocument();
  });

  it('renders with default config for unknown fitState', () => {
    // @ts-expect-error Testing invalid runtime value
    const { container } = render(<HardwareFitChip fitState="unknown-state" />);

    // The default config text is empty string, so no text should be present
    const textSpan = container.querySelector('.chipText');
    expect(textSpan).toBeInTheDocument();
    expect(textSpan?.textContent).toBe('');

    const chipBase = container.firstChild as HTMLElement;
    expect(chipBase).toHaveClass('chipBase');
    expect(chipBase).toHaveClass('chipPerfect'); // default config uses chipPerfect
  });

  it('contains the icon element and wrappers', () => {

    const { container } = render(<HardwareFitChip fitState="perfect" />);

    // Check that the icon wrapper exists
    const iconWrapper = container.querySelector('.iconWrapper');
    expect(iconWrapper).toBeInTheDocument();

    // Check that the text wrapper exists
    const textSpan = container.querySelector('.chipText');
    expect(textSpan).toBeInTheDocument();

    // lucide-react renders svgs
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
