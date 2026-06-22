import { useState } from 'react';
import { Button, Modal } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { PromoCode } from '@/entities/promocode';
import { useDeletePromoCode, useRedeemPromoCode } from '../model/hooks';
import styles from './RowActions.module.css';

interface RowActionsProps {
  promocode: PromoCode;
  onEdit: (promocode: PromoCode) => void;
  onNotify: (message: string, tone?: 'success' | 'error') => void;
}

export function RowActions({ promocode, onEdit, onNotify }: RowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useDeletePromoCode();
  const redeem = useRedeemPromoCode();

  const handleRedeem = async () => {
    try {
      await redeem.mutateAsync(promocode.id);
      onNotify(`Redeemed ${promocode.code}`, 'success');
    } catch (err) {
      onNotify(extractErrorMessage(err), 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(promocode.id);
      setConfirmOpen(false);
      onNotify(`Deleted ${promocode.code}`, 'success');
    } catch (err) {
      onNotify(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div className={styles.actions}>
      <button
        className={`${styles.iconButton} ${styles.redeem}`}
        onClick={handleRedeem}
        disabled={redeem.isPending}
        title="Использовать раз"
      >
        Исп.
      </button>
      <button className={styles.iconButton} onClick={() => onEdit(promocode)}>
        Ред.
      </button>
      <button
        className={`${styles.iconButton} ${styles.delete}`}
        onClick={() => setConfirmOpen(true)}
      >
        Удал.
      </button>

      <Modal
        open={confirmOpen}
        title="Удалить промокод"
        onClose={() => setConfirmOpen(false)}
      >
        <div className={styles.confirm}>
          <p>
            Удалить <strong>{promocode.code}</strong>? Это действие нельзя
            отменить.
          </p>
          <div className={styles.confirmActions}>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={remove.isPending}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? 'Удаление…' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
