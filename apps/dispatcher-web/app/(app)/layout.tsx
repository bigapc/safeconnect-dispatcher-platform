import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';

const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
	<ProtectedRoute>
		<AppShell>{children}</AppShell>
	</ProtectedRoute>
);

export default AuthenticatedLayout;
