import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Canvas } from '@/tool/components/Canvas';
import { DEFAULT_STATE, type ToolState } from '@/tool/types';

const base: ToolState = { ...DEFAULT_STATE, cases: [] };

describe('Canvas interactions', () => {
  it('shows a validation error instead of crashing on empty function name', () => {
    const onChange = vi.fn();
    render(<Canvas state={{ ...base, functionName: '', cases: [] }} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('btn-generate'));
    expect(screen.getByTestId('generate-error')).toHaveTextContent(/required/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('generates cases and calls onChange with them', () => {
    const onChange = vi.fn();
    render(<Canvas state={base} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('btn-generate'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const update = onChange.mock.calls[0]?.[0] as ToolState;
    expect(update.cases.length).toBeGreaterThan(0);
  });

  it('updates the signature field', () => {
    const onChange = vi.fn();
    render(<Canvas state={base} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('input-signature'), {
      target: { value: 'function alpha(): void' },
    });
    const update = onChange.mock.calls[0]?.[0] as ToolState;
    expect(update.signature).toBe('function alpha(): void');
  });

  it('updates the framework selection', () => {
    const onChange = vi.fn();
    render(<Canvas state={base} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('select-framework'), { target: { value: 'pytest' } });
    const update = onChange.mock.calls[0]?.[0] as ToolState;
    expect(update.framework).toBe('pytest');
  });

  it('adds and removes examples', () => {
    const onChange = vi.fn();
    render(<Canvas state={base} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('btn-add-example'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const withAdded = onChange.mock.calls[0]?.[0] as ToolState;
    expect(withAdded.examples).toHaveLength(2);

    render(<Canvas key="second" state={withAdded} onChange={onChange} />);
    fireEvent.click(screen.getByTestId(`btn-remove-example-${withAdded.examples[1]?.id}`));
    const withRemoved = onChange.mock.calls[1]?.[0] as ToolState;
    expect(withRemoved.examples).toHaveLength(1);
  });

  it('renders preview code and coverage list', () => {
    render(<Canvas state={{ ...base }} onChange={() => {}} />);
    expect(screen.getByTestId('preview-code')).toBeInTheDocument();
    expect(screen.getByTestId('coverage-happy-path')).toBeInTheDocument();
  });
});
