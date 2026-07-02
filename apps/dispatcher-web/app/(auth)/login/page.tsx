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
import { loginSchema, type LoginValues } from '@/lib/auth-schema';

const LoginPage = () => {
  const router = useRouter();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const login = useMutation({
    mutationFn: async (values: LoginValues) => {
      const response = await http.post<{ accessToken: string }>('/auth/login', values);
      return response.data;
    },
    onSuccess: (data) => {
      window.localStorage.setItem('safeconnect_access_token', data.accessToken);
      toast.success('Signed in successfully');
      router.push('/dashboard');
    },
    onError: () => {
      toast.error('Sign in failed');
    },
  });

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md animate-fade-up">
        <h1 className="text-2xl font-semibold">Welcome Back</h1>
        <p className="mt-1 text-sm text-foreground/70">Sign in to continue dispatch operations.</p>
        <form className="mt-5 space-y-3" onSubmit={form.handleSubmit((values) => login.mutate(values))}>
          <Input type="email" placeholder="Email" {...form.register('email')} />
          <Input type="password" placeholder="Password" {...form.register('password')} />
          <Button className="w-full" type="submit" disabled={login.isPending}>
            Sign In
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-xs">
          <Link href="/forgot-password">Forgot password</Link>
          <Link href="/register">Create account</Link>
        </div>
      </Card>
    </main>
  );
};

export default LoginPage;
