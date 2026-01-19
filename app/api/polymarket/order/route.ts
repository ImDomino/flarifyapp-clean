import { NextRequest, NextResponse } from 'next/server';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';

export async function POST(request: NextRequest) {
  try {
    const { tokenId, side, amount, price } = await request.json();

    // Validation
    if (!tokenId || !side || !amount || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Builder ID из env (это твой уникальный ID)
    const BUILDER_ID = process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_ID || 'FLARIFYAPP';

    // Для демо просто возвращаем успех с builder_id
    // В production здесь будет реальный CLOB клиент
    const mockOrder = {
      orderId: `mock_${Date.now()}`,
      tokenId,
      side,
      amount,
      price,
      builderId: BUILDER_ID,
      status: 'success'
    };

    return NextResponse.json({ success: true, order: mockOrder });
    
  } catch (error) {
    console.error('Order placement error:', error);
    return NextResponse.json(
      { error: 'Failed to place order' },
      { status: 500 }
    );
  }
}
