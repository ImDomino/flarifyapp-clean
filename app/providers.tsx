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
        // Даём время Privy создать wallet
        await new Promise(resolve => setTimeout(resolve, 2000));

        const supabase = createClient();
        
        const email = user.google?.email || user.email?.address || '';
        const username = user.google?.name || email.split('@')[0] || `User${user.id.slice(-6)}`;
        
        // Получаем wallet address из linkedAccounts
        let walletAddress: string | null = null;
        
        console.log('🔍 User linkedAccounts:', {
          total: user.linkedAccounts?.length || 0,
          accounts: user.linkedAccounts?.map(a => ({ 
            type: a.type, 
            walletClientType: (a as any).walletClientType,
            address: (a as any).address 
          }))
        });

        // Ищем embedded wallet
        const embeddedWallet = user.linkedAccounts?.find(
          (account: any) =>
            (account.type === 'wallet' || account.type === 'smart_wallet') &&
            account.walletClientType === 'privy' &&
            account.address
        );
        
        if (embeddedWallet) {
          walletAddress = (embeddedWallet as any).address;
          console.log('✅ Found embedded wallet:', walletAddress);
        } else {
          console.warn('⚠️ Wallet not created. Waiting 3 more seconds...');
          
          // Retry
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const retryWallet = user.linkedAccounts?.find(
            (account: any) =>
              (account.type === 'wallet' || account.type === 'smart_wallet') &&
              account.walletClientType === 'privy' &&
              account.address
          );
          
          if (retryWallet) {
            walletAddress = (retryWallet as any).address;
            console.log('✅ Found wallet after retry:', walletAddress);
          } else {
            console.error('❌ Wallet still not created. Check Privy Dashboard settings.');
          }
        }

        console.log('🔄 Syncing profile:', { 
          id: user.id, 
          email, 
          username,
          wallet_address: walletAddress
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
        // ПРАВИЛЬНЫЙ конфиг с ethereum
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <ProfileSync>{children}</ProfileSync>
    </PrivyProvider>
  );
}
