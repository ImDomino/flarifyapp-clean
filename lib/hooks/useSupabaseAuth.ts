'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@/lib/supabase/client';

export function useSupabaseAuth() {
  const { user, authenticated } = usePrivy();
  const supabase = createClient();

  useEffect(() => {
    if (authenticated && user) {
      // Создаём или обновляем профиль в Supabase
      const syncUser = async () => {
        try {
          const email = user.google?.email || user.email?.address;
          
          if (!email) return;

          // Проверяем существует ли профиль
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

          if (!existingProfile) {
            // Создаём профиль
            await supabase.from('profiles').insert({
              id: user.id,
              email: email,
              username: user.google?.name || email.split('@')[0],
            });
          }
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      };

      syncUser();
    }
  }, [authenticated, user, supabase]);
}
