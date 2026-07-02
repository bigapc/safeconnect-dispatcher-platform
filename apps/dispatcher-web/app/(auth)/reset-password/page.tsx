'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { http } from '@/lib/http';

const ResetPasswordPage = () => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await http.post('/auth/reset-password', { token, newPassword });
    },
    onSuccess: () => {
      toast.success('Password updated successfully');
    },
    onError: () => {
      toast.error('Unable to reset password');
    },
  });

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold">Reset Password</h1>
        <div className="mt-4 space-y-3">
          <Input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Reset token" />
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
          />
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Update password
          </Button>
        </div>
      </Card>
    </main>
  );
};

export default ResetPasswordPage;
