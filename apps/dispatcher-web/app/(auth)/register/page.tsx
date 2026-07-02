'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { http } from '@/lib/http';
import { registerSchema, type RegisterValues } from '@/lib/auth-schema';

const RegisterPage = () => {
  const router = useRouter();
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const register = useMutation({
    mutationFn: async (values: RegisterValues) => {
      await http.post('/auth/register', values);
    },
    onSuccess: () => {
      toast.success('Account created. Verify your email to continue.');
      router.push('/verify-email');
    },
    onError: () => {
      toast.error('Registration failed');
    },
  });

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md animate-fade-up">
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <form className="mt-5 space-y-3" onSubmit={form.handleSubmit((values) => register.mutate(values))}>
          <Input placeholder="First name" {...form.register('firstName')} />
          <Input placeholder="Last name" {...form.register('lastName')} />
          <Input type="email" placeholder="Email" {...form.register('email')} />
          <Input type="password" placeholder="Password" {...form.register('password')} />
          <Input placeholder="Phone (optional)" {...form.register('phone')} />
          <Button className="w-full" type="submit" disabled={register.isPending}>
            Create account
          </Button>
        </form>
        <p className="mt-4 text-xs">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </Card>
    </main>
  );
};

export default RegisterPage;
