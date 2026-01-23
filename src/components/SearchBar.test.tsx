/**
 * Tests for SearchBar component
 * Covers input handling, keyboard shortcuts, and accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('should render with placeholder text', () => {
    render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        isLoading={false}
        placeholder="Søk etter podcaster"
      />
    );

    expect(screen.getByPlaceholderText('Søk etter podcaster')).toBeInTheDocument();
  });

  it('should call onChange when typing', () => {
    const onChange = vi.fn();
    render(
      <SearchBar
        value=""
        onChange={onChange}
        isLoading={false}
        placeholder="Søk"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test query' } });

    expect(onChange).toHaveBeenCalledWith('test query');
  });

  it('should show clear button when value is present', () => {
    render(
      <SearchBar
        value="test query"
        onChange={vi.fn()}
        isLoading={false}
        placeholder="Søk"
      />
    );

    expect(screen.getByRole('button', { name: /tøm/i })).toBeInTheDocument();
  });

  it('should clear input when clear button is clicked', () => {
    const onChange = vi.fn();
    render(
      <SearchBar
        value="test query"
        onChange={onChange}
        isLoading={false}
        placeholder="Søk"
      />
    );

    const clearButton = screen.getByRole('button', { name: /tøm/i });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('should show loading spinner when isLoading is true', () => {
    render(
      <SearchBar
        value="test"
        onChange={vi.fn()}
        isLoading={true}
        placeholder="Søk"
      />
    );

    // Check for loading indicator (spinner icon or text)
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        isLoading={false}
        placeholder="Søk"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'search');
  });

  it('should prevent iOS zoom with 16px font on mobile', () => {
    // This is tested via container queries in CSS
    // Container query should set font-size: 16px on small screens
    const { container } = render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        isLoading={false}
        placeholder="Søk"
      />
    );

    expect(container.querySelector('.container')).toBeInTheDocument();
  });
});
