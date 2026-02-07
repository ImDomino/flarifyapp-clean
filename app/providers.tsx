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
 * 
 * ВАЖНО: НЕ перезаписываем username — пользователь мог его изменить!
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

        console.log('🔄 Syncing profile to Supabase:', { 
          userId: user.id, 
          email, 
          safeAddress,
        });

        // Check if profile exists first
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', user.id)
          .maybeSingle();

        if (!existing) {
          // New user — create profile with default username
          const username = user.google?.name || email.split('@')[0] || `User${user.id.slice(-6)}`;
          const { error } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email,
              username,
              wallet_address: safeAddress,
              updated_at: new Date().toISOString(),
            });

          if (error) {
            console.error('❌ Profile create error:', error);
          } else {
            console.log('✅ New profile created with Safe address:', safeAddress);
          }
        } else {
          // Existing user — only update wallet_address and email, NOT username
          const { error } = await supabase
            .from('profiles')
            .update({
              email,
              wallet_address: safeAddress,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (error) {
            console.error('❌ Profile update error:', error);
          } else {
            console.log('✅ Profile synced (wallet only), preserved username:', existing.username);
          }
        }

        setSynced(true);
      } catch (error) {
        console.error('❌ Sync error:', error);
      }
    };

    const timer = setTimeout(syncProfile, 1000);
    return () => clearTimeout(timer);
  }, [authenticated, user, ready, safeAddress, synced]);

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
