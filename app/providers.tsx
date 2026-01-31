'use client';

import { WalletProvider } from '@/providers/WalletProvider';
import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@/lib/supabase/client';

function ProfileSync({ children }: { children: React.ReactNode }) {
  const { authenticated, user, ready } = usePrivy();

  useEffect(() => {
    if (!ready || !authenticated || !user) return;

    const syncProfile = async () => {
      try {
        // Даём время Privy создать wallet
        await new Promise(resolve => setTimeout(resolve, 2000));

        const supabase = createClient();
        
        const email = user.google?.email || user.email?.address || '';
        const username = user.google?.name || email.split('@')[0] || `User${user.id.slice(-6)}`;
        
        // Получаем wallet address
        const embeddedWallet = user.linkedAccounts?.find(
          (account: any) =>
            account.type === 'wallet' &&
            account.walletClientType === 'privy' &&
            account.address
        );
        
        const walletAddress = embeddedWallet ? (embeddedWallet as any).address : null;

        console.log('🔄 Syncing profile:', { userId: user.id, email, walletAddress });

        // Upsert profile
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email,
            username,
            wallet_address: walletAddress,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Profile sync error:', error);
        } else {
          console.log('✅ Profile synced');
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    };

    syncProfile();
  }, [authenticated, user, ready]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ProfileSync>{children}</ProfileSync>
    </WalletProvider>
  );
}
