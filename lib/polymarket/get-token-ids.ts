/**
 * Получает token IDs для YES/NO outcomes конкретного рынка
 * Использует Polymarket Gamma API
 */
export async function getMarketTokenIds(marketId: string): Promise<{
  yesTokenId: string | null;
  noTokenId: string | null;
}> {
  try {
    console.log('🔍 Fetching tokenIds for market:', marketId);

    // Пробуем получить детали рынка
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets/${marketId}`
    );

    if (!response.ok) {
      console.warn('⚠️ Failed to fetch market details:', response.status);
      return { yesTokenId: null, noTokenId: null };
    }

    const market = await response.json();

    // Способ 1: clobTokenIds
    if (market.clobTokenIds && Array.isArray(market.clobTokenIds) && market.clobTokenIds.length >= 2) {
      console.log('✅ Found clobTokenIds:', market.clobTokenIds);
      return {
        yesTokenId: market.clobTokenIds[0],
        noTokenId: market.clobTokenIds[1],
      };
    }

    // Способ 2: tokens array
    if (market.tokens && Array.isArray(market.tokens)) {
      const yesToken = market.tokens.find((t: any) => 
        t.outcome?.toLowerCase() === 'yes'
      );
      const noToken = market.tokens.find((t: any) => 
        t.outcome?.toLowerCase() === 'no'
      );

      if (yesToken?.token_id && noToken?.token_id) {
        console.log('✅ Found tokens:', { yesTokenId: yesToken.token_id, noTokenId: noToken.token_id });
        return {
          yesTokenId: yesToken.token_id,
          noTokenId: noToken.token_id,
        };
      }
    }

    console.warn('⚠️ No tokenIds found in market response');
    return { yesTokenId: null, noTokenId: null };
  } catch (error) {
    console.error('❌ Error fetching tokenIds:', error);
    return { yesTokenId: null, noTokenId: null };
  }
}
