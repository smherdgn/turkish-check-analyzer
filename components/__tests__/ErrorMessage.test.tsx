import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ErrorMessage } from '../ErrorMessage';
import '@testing-library/jest-dom/vitest';

describe('ErrorMessage', () => {
  it('renders title and message', () => {
    render(<ErrorMessage title="Title" message="Message" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Title');
    expect(screen.getByRole('alert')).toHaveTextContent('Message');
  });
});
