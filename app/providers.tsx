'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

function SupabaseSync({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['google'],
        appearance: {
          theme: 'dark',
          accentColor: '#22c55e',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          noPromptOnSignature: true,
        },
      }}
      onSuccess={async (user) => {
        // Когда пользователь логинится - создаём профиль в Supabase
        try {
          const supabase = createClient();
          const email = user.google?.email || user.email?.address || '';
          const username = user.google?.name || email.split('@')[0];

          // Проверяем существует ли профиль
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!existingProfile) {
            // Создаём профиль
            await supabase.from('profiles').upsert({
              id: user.id,
              email: email,
              username: username,
            });
          }
        } catch (error) {
          console.error('Error creating profile:', error);
        }
      }}
    >
      <SupabaseSync>{children}</SupabaseSync>
    </PrivyProvider>
  );
}
