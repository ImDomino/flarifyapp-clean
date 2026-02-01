import { NextRequest, NextResponse } from 'next/server';
import { placeUserOrder } from '@/lib/polymarket/clob-server';
import { Side } from '@polymarket/clob-client';

export async function POST(req: NextRequest) {
  try {
    // Читаем body ОДИН РАЗ
    const body = await req.json();
    
    const { userId, walletAddress, tokenId, side, amount, price } = body;

    // Валидация
    if (!userId || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing userId or walletAddress' },
        { status: 400 }
      );
    }

    if (!tokenId || !side || !amount || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, side, amount, price' },
        { status: 400 }
      );
    }

    if (side !== 'BUY' && side !== 'SELL') {
      return NextResponse.json(
        { error: 'Invalid side. Must be BUY or SELL' },
        { status: 400 }
      );
    }

    // Маппинг строкового side -> enum Side
    const clobSide = side === 'BUY' ? Side.BUY : Side.SELL;

    console.log('📥 Order request:', {
      userId: userId.slice(0, 10) + '...',
      wallet: walletAddress.slice(0, 6) + '...',
      tokenId: tokenId.slice(0, 10) + '...',
      side,
      amount,
      price,
    });

    // Передаём уже прочитанный body в placeUserOrder
    const result = await placeUserOrder(req, {
      userId,
      walletAddress,
      tokenId,
      side: clobSide,
      amount,
      price,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Error placing order:', error);

    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to place order',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
