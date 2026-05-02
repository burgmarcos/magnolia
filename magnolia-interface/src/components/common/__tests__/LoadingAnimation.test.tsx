import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingAnimation, LinearExpressiveLoader } from '../LoadingAnimation';

describe('LoadingAnimation Components', () => {
  describe('LoadingAnimation', () => {
    it('renders without crashing', () => {
      const { container } = render(<LoadingAnimation />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('LinearExpressiveLoader', () => {
    it('renders without crashing', () => {
      const { container } = render(<LinearExpressiveLoader />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
