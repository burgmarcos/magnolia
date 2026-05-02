import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalizationSettings } from '../PersonalizationSettings';

const mockSetMatchIconsToTheme = vi.fn();

vi.mock('../../../context/PreferencesContext', () => ({
  usePreferences: () => ({
    matchIconsToTheme: false,
    setMatchIconsToTheme: mockSetMatchIconsToTheme,
  }),
}));

describe('PersonalizationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<PersonalizationSettings onWallpaperChange={() => {}} />);
    expect(screen.getByText('Personalization')).toBeInTheDocument();
    expect(screen.getByText('Wallpaper Gallery')).toBeInTheDocument();
    expect(screen.getByText('Vibrant Abstract')).toBeInTheDocument();
    expect(screen.getByText('Soft Flow')).toBeInTheDocument();
    expect(screen.getByText('Glass Patterns')).toBeInTheDocument();
  });

  it('calls onWallpaperChange when a wallpaper is clicked', () => {
    const mockOnWallpaperChange = vi.fn();
    render(<PersonalizationSettings onWallpaperChange={mockOnWallpaperChange} />);

    fireEvent.click(screen.getByText('Vibrant Abstract'));
    expect(mockOnWallpaperChange).toHaveBeenCalledWith('/wallpapers/vibrant_abstract.png');
  });

  it('highlights the current wallpaper', () => {
    const currentUrl = '/wallpapers/soft_flow.svg';
    render(
      <PersonalizationSettings onWallpaperChange={() => {}} currentWallpaper={currentUrl} />
    );

    // The component applies '4px solid var(--schemes-primary)' to the selected wallpaper
    // and '1px solid var(--schemes-outline-variant)' to others.
    const softFlowImg = screen.getByAltText('Soft Flow');
    const softFlowCard = softFlowImg.parentElement;
    expect(softFlowCard?.style.border).toBe('4px solid var(--schemes-primary)');

    const vibrantImg = screen.getByAltText('Vibrant Abstract');
    const vibrantCard = vibrantImg.parentElement;
    expect(vibrantCard?.style.border).toBe('1px solid var(--schemes-outline-variant)');
  });

  it('toggles matchIconsToTheme when clicked', () => {
    render(<PersonalizationSettings onWallpaperChange={() => {}} />);

    // The click handler is on the parent div containing "Thematic App Icons"
    const thematicAppIcons = screen.getByText('Thematic App Icons');
    const cardElement = thematicAppIcons.parentElement?.parentElement;
    if (cardElement) {
        fireEvent.click(cardElement);
    } else {
        throw new Error('Card element not found');
    }

    expect(mockSetMatchIconsToTheme).toHaveBeenCalledWith(true); // Since initial is mocked as false (!false = true)
  });
});
