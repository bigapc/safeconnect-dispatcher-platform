'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { http } from '@/lib/http';

const VerifyEmailPage = () => {
  const [token, setToken] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await http.post('/auth/verify-email', { token });
    },
    onSuccess: () => {
      toast.success('Email verified. You can now sign in.');
    },
    onError: () => {
      toast.error('Verification failed');
    },
  });

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold">Verify Email</h1>
        <div className="mt-4 space-y-3">
          <Input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Verification token" />
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Verify account
          </Button>
        </div>
      </Card>
    </main>
  );
};

export default VerifyEmailPage;
