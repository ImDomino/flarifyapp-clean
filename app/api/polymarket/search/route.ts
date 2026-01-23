import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.length < 2) {
      return NextResponse.json({ markets: [] });
    }

    // Polymarket Gamma API
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets?limit=10&active=true&closed=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch markets');
    }

    const markets = await response.json();

    // Фильтруем по query (простой поиск по названию)
    const filtered = markets.filter((market: any) => {
      const searchText = `${market.question} ${market.description || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    // Форматируем для фронтенда
    const formatted = filtered.slice(0, 10).map((market: any) => ({
      id: market.condition_id || market.id,
      question: market.question,
      description: market.description,
      url: `https://polymarket.com/event/${market.slug}`,
      outcomes: market.outcomes || ['Yes', 'No'],
      outcomePrices: market.outcomePrices 
        ? market.outcomePrices.split(',').map((p: string) => parseFloat(p))
        : null,
      volume: market.volume,
      liquidity: market.liquidity,
      endDate: market.end_date_iso,
    }));

    return NextResponse.json({ markets: formatted });
  } catch (error) {
    console.error('Error searching markets:', error);
    return NextResponse.json(
      { error: 'Failed to search markets', markets: [] },
      { status: 500 }
    );
  }
}
