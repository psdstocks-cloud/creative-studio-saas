import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

const formSchema = z.object({
  amount: z.string().refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num !== 0;
    },
    {
      message: 'Amount must be a non-zero number.',
    }
  ),
  reason: z.string().min(10, {
    message: 'Audit reason must be at least 10 characters.',
  }),
});

interface AdjustBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number, reason: string) => void;
  userId: string;
  userEmail?: string;
  currentBalance?: number;
  isLoading?: boolean;
}

export function AdjustBalanceDialog({
  open,
  onOpenChange,
  onSubmit,
  userId,
  userEmail,
  currentBalance,
  isLoading = false,
}: AdjustBalanceDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
      reason: '',
    },
  });

  const watchAmount = form.watch('amount');
  const amountNum = Number(watchAmount) || 0;
  const newBalance = (currentBalance || 0) + amountNum;

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(Number(values.amount), values.reason);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust User Balance</DialogTitle>
          <DialogDescription>
            {userEmail ? (
              <>
                Adjusting balance for{' '}
                <span className="font-medium text-slate-300">{userEmail}</span>
              </>
            ) : (
              <>
                Adjusting balance for user{' '}
                <span className="font-mono text-slate-300">{userId}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {typeof currentBalance === 'number' && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Current Balance:</span>
                  <span className="font-medium text-slate-200">
                    {currentBalance.toFixed(2)} credits
                  </span>
                </div>
                {watchAmount && !isNaN(amountNum) && amountNum !== 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">New Balance:</span>
                    <span
                      className={`font-semibold ${newBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {newBalance.toFixed(2)} credits
                    </span>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 100 or -50" {...field} />
                  </FormControl>
                  <FormDescription>
                    Positive number to add credits, negative to deduct.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audit Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Customer support credit adjustment for issue #1234"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Adjusting...' : 'Adjust Balance'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
