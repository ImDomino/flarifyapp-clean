'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@/lib/supabase/client';

function ProfileSync({ children }: { children: React.ReactNode }) {
  const { authenticated, user, ready } = usePrivy();

  useEffect(() => {
    if (!ready || !authenticated || !user) return;

    const syncProfile = async () => {
      try {
        const supabase = createClient();
        
        const email = user.google?.email || user.email?.address || '';
        const username = user.google?.name || email.split('@')[0] || `User${user.id.slice(-6)}`;
        
        // Ждём пока wallet создастся (может занять время)
        let walletAddress = null;
        
        // Пробуем получить wallet address
        if (user.wallet?.address) {
          walletAddress = user.wallet.address;
        } else if (user.linkedAccounts) {
          // Ищем embedded wallet в linked accounts
          const embeddedWallet = user.linkedAccounts.find(
            (account: any) => account.type === 'wallet' && account.walletClient === 'privy'
          );
          if (embeddedWallet?.address) {
            walletAddress = embeddedWallet.address;
          }
        }

        console.log('🔄 Syncing profile:', { 
          id: user.id, 
          email, 
          username,
          wallet_address: walletAddress,
          linkedAccounts: user.linkedAccounts?.length || 0
        });

        // Upsert профиль
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          email: email,
          username: username,
          wallet_address: walletAddress,
        }, {
          onConflict: 'id'
        });

        if (error) {
          console.error('❌ Error syncing profile:', error);
        } else {
          console.log('✅ Profile synced successfully');
        }
      } catch (error) {
        console.error('💥 Error in profile sync:', error);
      }
    };

    syncProfile();
  }, [authenticated, user, ready]);

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
