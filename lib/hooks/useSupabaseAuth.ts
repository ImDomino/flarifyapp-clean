'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@/lib/supabase/client';

export function useSupabaseAuth() {
  const { user, authenticated } = usePrivy();
  const supabase = createClient();

  useEffect(() => {
    if (authenticated && user) {
      const syncUser = async () => {
        try {
          const email = user.google?.email || user.email?.address;
          
          if (!email) return;

          // Проверяем существует ли профиль по id
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (!existingProfile) {
            // Создаём профиль только если его нет
            await supabase.from('profiles').insert({
              id: user.id,
              email: email,
              username: user.google?.name || email.split('@')[0],
            });
          }
          // Если профиль уже есть — ничего не перезаписываем
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      };

      syncUser();
    }
  }, [authenticated, user, supabase]);
}
