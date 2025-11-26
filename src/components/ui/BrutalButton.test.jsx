import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BrutalButton from './BrutalButton';

const mockTheme = {
    id: 'default',
    border: 'border-2 border-black',
    shadow: 'shadow-black',
    shadowHover: 'hover:shadow-black',
    colors: {
        card: 'bg-white',
    },
};

describe('BrutalButton', () => {
    it('renders children correctly', () => {
        render(<BrutalButton theme={mockTheme}>Click Me</BrutalButton>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<BrutalButton onClick={handleClick} theme={mockTheme}>Click Me</BrutalButton>);

        fireEvent.click(screen.getByText('Click Me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies active styles when active prop is true', () => {
        render(<BrutalButton active={true} theme={mockTheme}>Active Button</BrutalButton>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('translate-x-[4px]');
    });
});
