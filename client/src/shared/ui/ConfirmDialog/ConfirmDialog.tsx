import { t } from '@/shared/i18n';
import { Button } from '../Button/Button';
import { Modal } from '../Modal/Modal';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  text,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('action.cancel')}
        </Button>
        <Button
          variant={danger ? 'dangerFilled' : 'primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {t('action.confirm')}
        </Button>
      </div>
    </Modal>
  );
}
