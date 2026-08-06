import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import styles from './Field.module.css';

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({
  label,
  error,
  hint,
  children,
}: FieldWrapperProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
      {error ? (
        <span className={styles.errorText}>{error}</span>
      ) : (
        hint && <span className={styles.hintText}>{hint}</span>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...rest }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <input
        ref={ref}
        className={`${styles.control} ${error ? styles.error : ''} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  ),
);
Input.displayName = 'Input';

export interface SelectOption {
  value: string;
  label: string;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className = '', ...rest }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <select
        ref={ref}
        className={`${styles.control} ${error ? styles.error : ''} ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  ),
);
Select.displayName = 'Select';
