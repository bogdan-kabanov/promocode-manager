import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import styles from './Field.module.css';

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, error, children }: FieldWrapperProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...rest }, ref) => (
    <FieldWrapper label={label} error={error}>
      <input
        ref={ref}
        className={`${styles.control} ${error ? styles.error : ''} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  ),
);
Input.displayName = 'Input';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...rest }, ref) => (
    <FieldWrapper label={label} error={error}>
      <select
        ref={ref}
        className={`${styles.control} ${error ? styles.error : ''} ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  ),
);
Select.displayName = 'Select';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...rest }, ref) => (
    <FieldWrapper label={label} error={error}>
      <textarea
        ref={ref}
        className={`${styles.control} ${error ? styles.error : ''} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  ),
);
Textarea.displayName = 'Textarea';
