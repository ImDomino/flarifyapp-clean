import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json({ markets: [] });
    }

    // Пробуем сначала public-search
    const searchUrl = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(query)}&limit=50`;
    
    console.log('🔍 Searching Polymarket:', searchUrl);

    let response = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
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

    // Если мало результатов - пробуем /markets с фильтром
    if (markets.length < 5) {
      console.log('📊 Trying /markets endpoint...');
      const marketsUrl = `https://gamma-api.polymarket.com/markets?closed=false&order=volumeNum&ascending=false&limit=50`;
      
      response = await fetch(marketsUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const allMarkets = await response.json();
        
        // Фильтруем по query
        const filtered = allMarkets.filter((m: any) => {
          const searchText = `${m.question || ''} ${m.description || ''}`.toLowerCase();
          return searchText.includes(query.toLowerCase());
        });

        markets = [...markets, ...filtered];
      }
    }

    console.log('📊 Raw markets count:', markets.length);

    // ФИЛЬТРУЕМ закрытые и старые рынки
    const now = new Date();
    markets = markets.filter((m: any) => {
      // Убираем closed
      if (m.closed === true || m.active === false) {
        return false;
      }

      // Убираем с прошедшей датой окончания
      const endDate = m.endDate || m.end_date_iso || m.end_date;
      if (endDate) {
        const end = new Date(endDate);
        if (end < now) {
          console.log('🗑️ Filtering out expired:', m.question?.slice(0, 40));
          return false;
        }
      }

      return true;
    });

    console.log('✅ Active markets count:', markets.length);

    // Убираем дубликаты по id
    const seen = new Set();
    markets = markets.filter((m: any) => {
      const id = m.conditionId || m.condition_id || m.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Форматируем
    const formatted = markets.slice(0, 10).map((market: any) => {
      // Парсим outcomes
      let outcomes = ['Yes', 'No'];
      if (market.outcomes && Array.isArray(market.outcomes)) {
        outcomes = market.outcomes;
      } else if (typeof market.outcomes === 'string') {
        try {
          outcomes = JSON.parse(market.outcomes);
        } catch {
          outcomes = market.outcomes.split(',').map((s: string) => s.trim());
        }
      }

      // Парсим prices
      let prices: number[] | null = null;
      if (market.outcomePrices) {
        if (Array.isArray(market.outcomePrices)) {
          prices = market.outcomePrices.map((p: any) => parseFloat(p));
        } else if (typeof market.outcomePrices === 'string') {
          try {
            prices = JSON.parse(market.outcomePrices).map((p: any) => parseFloat(p));
          } catch {
            prices = market.outcomePrices.split(',').map((p: string) => parseFloat(p.trim()));
          }
        }
      }

      // Если нет prices, пробуем из tokens
      if (!prices && market.tokens && Array.isArray(market.tokens)) {
        prices = market.tokens.map((t: any) => parseFloat(t.price || 0));
      }

      // Slug для URL
      let slug = market.slug || market.marketSlug || market.id;
      let url = `https://polymarket.com/event/${slug}`;

      const formatted = {
        id: market.conditionId || market.condition_id || market.id || slug,
        question: market.question || market.title || 'Unknown Market',
        description: market.description || '',
        url,
        outcomes,
        outcomePrices: prices,
        volume: market.volume?.toString() || market.volumeNum?.toString() || '0',
        liquidity: market.liquidity?.toString() || '0',
        endDate: market.endDate || market.end_date_iso,
      };

      console.log('📈', formatted.question.slice(0, 50), '| Prices:', prices, '| Vol:', formatted.volume.slice(0, 10));

      return formatted;
    });

    return NextResponse.json({ markets: formatted });
  } catch (error) {
    console.error('💥 Error searching markets:', error);
    return NextResponse.json(
      { error: 'Failed to search markets', markets: [] },
      { status: 500 }
    );
  }
}
