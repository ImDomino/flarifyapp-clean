'use client';

import { WalletProvider, useWallet } from '@/providers/WalletProvider';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@/lib/supabase/client';

/**
 * Синхронизирует профиль пользователя с Supabase
 * 
 * ВАЖНО: Сохраняем Safe address, а не EOA!
 * Safe - это адрес который держит USDC и позиции
 */


function ProfileSync({ children }: { children: React.ReactNode }) {
  const { authenticated, user, ready } = usePrivy();
  const { safeAddress } = useWallet();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated || !user || !safeAddress || synced) return;

    const syncProfile = async () => {
      try {
        const supabase = createClient();
        
        const email = user.google?.email || user.email?.address || '';
        const username = user.google?.name || email.split('@')[0] || `User${user.id.slice(-6)}`;

        console.log('🔄 Syncing profile to Supabase:', { 
          userId: user.id, 
          email, 
          safeAddress, // ← Safe address, не EOA!
        });

        // Upsert profile с Safe address
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email,
            username,
            wallet_address: safeAddress, // ← КРИТИЧНО: Safe address!
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('❌ Profile sync error:', error);
        } else {
          console.log('✅ Profile synced with Safe address:', safeAddress);
          setSynced(true);
        }
      } catch (error) {
        console.error('❌ Sync error:', error);
      }
    };

    // Небольшая задержка для стабильности
    const timer = setTimeout(syncProfile, 1000);
    return () => clearTimeout(timer);
  }, [authenticated, user, ready, safeAddress, synced]);

  // Сбрасываем synced при logout
  useEffect(() => {
    if (!authenticated) {
      setSynced(false);
    }
  }, [authenticated]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ProfileSync>{children}</ProfileSync>
    </WalletProvider>
  );
}
