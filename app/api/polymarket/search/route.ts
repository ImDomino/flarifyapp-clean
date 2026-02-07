import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback: получает clobTokenIds по slug напрямую
 */
async function fetchTokenIdsBySlug(slug: string) {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets/slug/${slug}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      console.warn('⚠️ slug fallback failed:', slug, res.status);
      return { yesTokenId: undefined as string | undefined, noTokenId: undefined as string | undefined, tokens: undefined as any[] | undefined };
    }

    const market = await res.json();

    let clobTokenIds: string[] = [];

    // clobTokenIds может быть массивом или строкой с JSON
    if (Array.isArray(market.clobTokenIds)) {
      clobTokenIds = market.clobTokenIds;
    } else if (typeof market.clobTokenIds === 'string') {
      try {
        clobTokenIds = JSON.parse(market.clobTokenIds);
      } catch (e) {
        console.warn('⚠️ Failed to parse clobTokenIds string in slug fallback:', market.clobTokenIds, e);
      }
    }

    const [yesTokenId, noTokenId] = clobTokenIds;

    console.log('✅ Slug fallback found:', { slug, yesTokenId, noTokenId });

    return {
      yesTokenId,
      noTokenId,
      tokens: market.tokens as any[] | undefined,
    };
  } catch (e) {
    console.error('💥 Error in fetchTokenIdsBySlug:', e);
    return { yesTokenId: undefined as string | undefined, noTokenId: undefined as string | undefined, tokens: undefined as any[] | undefined };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json({ markets: [] });
    }

    // 1) public-search
    const searchUrl = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(
      query
    )}&limit=50`;

    console.log('🔍 Searching Polymarket:', searchUrl);

    let response = await fetch(searchUrl, {
      headers: { Accept: 'application/json' },
    });

    let markets: any[] = [];

    if (response.ok) {
      const data = await response.json();

      if (data.markets && Array.isArray(data.markets)) {
        markets = data.markets;
      } else if (data.events && Array.isArray(data.events)) {
        data.events.forEach((event: any) => {
          if (event.markets && Array.isArray(event.markets)) {
            markets.push(...event.markets);
          }
        });
      }
    }

    // 2) /markets fallback, если мало результатов
    if (markets.length < 5) {
      console.log('📊 Trying /markets endpoint...');
      const marketsUrl =
        'https://gamma-api.polymarket.com/markets?closed=false&order=volumeNum&ascending=false&limit=50';

      response = await fetch(marketsUrl, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const allMarkets = await response.json();

        const filtered = allMarkets.filter((m: any) => {
          const searchText = `${m.question || ''} ${
            m.description || ''
          }`.toLowerCase();
          return searchText.includes(query.toLowerCase());
        });

        markets = [...markets, ...filtered];
      }
    }

    console.log('📊 Raw markets count:', markets.length);

    // Фильтр по активности / дате
    const now = new Date();
    markets = markets.filter((m: any) => {
      if (m.closed === true || m.active === false) {
        return false;
      }

      const endDate = m.endDate || m.end_date_iso || m.end_date;
      if (endDate) {
        const end = new Date(endDate);
        if (end < now) {
          return false;
        }
      }

      return true;
    });

    console.log('✅ Active markets count:', markets.length);

    // Убираем дубликаты по id
    const seen = new Set<string>();
    markets = markets.filter((m: any) => {
      const id = m.conditionId || m.condition_id || m.id;
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Форматируем + подтягиваем tokenIds
    const formatted = await Promise.all(
      markets.slice(0, 10).map(async (market: any) => {
        // Outcomes
        let outcomes: string[] = ['Yes', 'No'];
        if (Array.isArray(market.outcomes)) {
          outcomes = market.outcomes;
        } else if (typeof market.outcomes === 'string') {
          try {
            outcomes = JSON.parse(market.outcomes);
          } catch {
            outcomes = market.outcomes
              .split(',')
              .map((s: string) => s.trim());
          }
        }

        // Prices
        let prices: number[] | null = null;
        if (market.outcomePrices) {
          if (Array.isArray(market.outcomePrices)) {
            prices = market.outcomePrices.map((p: any) => parseFloat(p));
          } else if (typeof market.outcomePrices === 'string') {
            try {
              prices = JSON.parse(market.outcomePrices).map((p: any) =>
                parseFloat(p)
              );
            } catch {
              prices = market.outcomePrices
                .split(',')
                .map((p: string) => parseFloat(p.trim()));
            }
          }
        }

        if (!prices && Array.isArray(market.tokens)) {
          prices = market.tokens.map((t: any) =>
            parseFloat(t.price || 0)
          );
        }

        // Slug / URL
        const slug = market.slug || market.marketSlug || market.id;
        const url = `https://polymarket.com/event/${slug}`;

        // Token IDs
        let yesTokenId: string | undefined;
        let noTokenId: string | undefined;
        let tokens: any[] | undefined;

        // 1) clobTokenIds массив
        if (
          Array.isArray(market.clobTokenIds) &&
          market.clobTokenIds.length >= 2
        ) {
          yesTokenId = market.clobTokenIds[0];
          noTokenId = market.clobTokenIds[1];
          console.log('✅ Found clobTokenIds (array):', {
            slug,
            yesTokenId,
            noTokenId,
          });
        }
        // 1b) clobTokenIds строка JSON
        else if (typeof market.clobTokenIds === 'string') {
          try {
            const parsed = JSON.parse(market.clobTokenIds);
            if (Array.isArray(parsed) && parsed.length >= 2) {
              yesTokenId = parsed[0];
              noTokenId = parsed[1];
              console.log('✅ Parsed clobTokenIds (string):', {
                slug,
                yesTokenId,
                noTokenId,
              });
            }
          } catch (e) {
            console.warn(
              '⚠️ Failed to parse clobTokenIds string:',
              market.clobTokenIds,
              e
            );
          }
        }
        // 2) tokens по outcome
        else if (Array.isArray(market.tokens) && market.tokens.length >= 2) {
          tokens = market.tokens;
          const yesToken = market.tokens.find(
            (t: any) => t.outcome?.toLowerCase() === 'yes'
          );
          const noToken = market.tokens.find(
            (t: any) => t.outcome?.toLowerCase() === 'no'
          );
          yesTokenId = yesToken?.token_id;
          noTokenId = noToken?.token_id;
          console.log('✅ Found tokens by outcome:', {
            slug,
            yesTokenId,
            noTokenId,
          });
        }
        // 3) прямые поля (на всякий случай)
        else if (market.yesTokenId || market.noTokenId) {
          yesTokenId = market.yesTokenId;
          noTokenId = market.noTokenId;
          console.log('✅ Found direct tokenIds:', {
            slug,
            yesTokenId,
            noTokenId,
          });
        }

        // 4) fallback по slug, если всё ещё нет токенов
        if (!yesTokenId || !noTokenId) {
          console.log('🔁 Fallback to /markets/slug for:', slug);
          const fallback = await fetchTokenIdsBySlug(slug);
          if (fallback.yesTokenId && fallback.noTokenId) {
            yesTokenId = fallback.yesTokenId;
            noTokenId = fallback.noTokenId;
            tokens = tokens || fallback.tokens;
            console.log('✅ Fallback tokenIds from slug:', {
              slug,
              yesTokenId,
              noTokenId,
            });
          }
        }

        if (!yesTokenId || !noTokenId) {
          console.warn('⚠️ No tokenIds found for market:', {
            id: market.id,
            question: market.question?.slice(0, 50),
          });
        }

        const formattedMarket = {
          id:
            market.conditionId ||
            market.condition_id ||
            market.id ||
            slug,
          question: market.question || market.title || 'Unknown Market',
          description: market.description || '',
          url,
          outcomes,
          outcomePrices: prices,
          volume:
            market.volume?.toString() ||
            market.volumeNum?.toString() ||
            '0',
          liquidity: market.liquidity?.toString() || '0',
          endDate: market.endDate || market.end_date_iso,
          yesTokenId,
          noTokenId,
          tokens,
          negRisk: market.neg_risk === "true" || market.neg_risk === true || market.negRisk === true,
        };

        console.log(
          '📈',
          formattedMarket.question.slice(0, 50),
          '| YES:',
          yesTokenId?.slice(0, 10),
          '| NO:',
          noTokenId?.slice(0, 10)
        );

        return formattedMarket;
      })
    );

    return NextResponse.json({ markets: formatted });
  } catch (error) {
    console.error('💥 Error searching markets:', error);
    return NextResponse.json(
      { error: 'Failed to search markets', markets: [] },
      { status: 500 }
    );
  }
}
