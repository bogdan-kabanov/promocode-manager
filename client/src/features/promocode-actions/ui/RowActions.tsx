import { useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
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
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [orderAmount, setOrderAmount] = useState('');
  const remove = useDeletePromoCode();
  const redeem = useRedeemPromoCode();

  const isPercentage = promocode.discountType === 'PERCENTAGE';

  const handleRedeem = async () => {
    const parsed = orderAmount.trim() === '' ? undefined : Number(orderAmount);
    if (parsed !== undefined && (Number.isNaN(parsed) || parsed < 0)) {
      onNotify('Сумма заказа должна быть неотрицательным числом', 'error');
      return;
    }
    try {
      await redeem.mutateAsync({ id: promocode.id, orderAmount: parsed });
      setRedeemOpen(false);
      setOrderAmount('');
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
        onClick={() => setRedeemOpen(true)}
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
        open={redeemOpen}
        title={`Использовать ${promocode.code}`}
        onClose={() => setRedeemOpen(false)}
      >
        <div className={styles.confirm}>
          <Input
            label="Сумма заказа"
            type="number"
            min={0}
            step="0.01"
            placeholder={isPercentage ? 'Обязательно для % скидки' : 'Необязательно'}
            value={orderAmount}
            onChange={(e) => setOrderAmount(e.target.value)}
          />
          <p>
            {isPercentage
              ? 'Скидка считается как процент от суммы заказа.'
              : 'Фиксированная скидка ограничивается суммой заказа, если она указана.'}
          </p>
          <div className={styles.confirmActions}>
            <Button
              variant="secondary"
              onClick={() => setRedeemOpen(false)}
              disabled={redeem.isPending}
            >
              Отмена
            </Button>
            <Button onClick={handleRedeem} disabled={redeem.isPending}>
              {redeem.isPending ? 'Применение…' : 'Использовать'}
            </Button>
          </div>
        </div>
      </Modal>

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
