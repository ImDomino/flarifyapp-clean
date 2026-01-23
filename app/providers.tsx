'use client';

import { useEffect } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { createClient } from '@/lib/supabase/client';

function ProfileSync({ children }: { children: React.ReactNode }) {
  const { authenticated, user } = usePrivy();

  useEffect(() => {
    if (!authenticated || !user) return;

    const syncProfile = async () => {
      try {
        const supabase = createClient();
        
        const email = user.google?.email || user.email?.address || '';
        const username = user.google?.name || email.split('@')[0] || `User${user.id.slice(-6)}`;

        console.log('Syncing profile:', { id: user.id, email, username });

        // Upsert профиль (создаём или обновляем)
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          email: email,
          username: username,
        }, {
          onConflict: 'id'
        });

        if (error) {
          console.error('Error syncing profile:', error);
        } else {
          console.log('Profile synced successfully');
        }
      } catch (error) {
        console.error('Error in profile sync:', error);
      }
    };

    syncProfile();
  }, [authenticated, user]);

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
    >
      <ProfileSync>{children}</ProfileSync>
    </PrivyProvider>
  );
}