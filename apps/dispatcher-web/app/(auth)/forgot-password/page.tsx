'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { http } from '@/lib/http';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await http.post('/auth/forgot-password', { email });
    },
    onSuccess: () => {
      toast.success('Reset instructions sent if the account exists.');
    },
    onError: () => {
      toast.error('Unable to process request');
    },
  });

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold">Forgot Password</h1>
        <p className="mt-1 text-sm text-foreground/70">Enter your work email for reset instructions.</p>
        <div className="mt-4 space-y-3">
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Send reset link
          </Button>
        </div>
      </Card>
    </main>
  );
};

export default ForgotPasswordPage;
