import { NextRequest, NextResponse } from 'next/server';
import { buildHmacSignature, BuilderApiKeyCreds } from '@polymarket/builder-signing-sdk';

// Builder API Credentials (ДЕРЖАТЬ В СЕКРЕТЕ!)
const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

/**
 * POST /api/polymarket/sign
 * 
 * Remote signing endpoint для Polymarket Builder attribution.
 * Принимает детали запроса от клиента, генерирует HMAC подпись
 * с использованием builder credentials, возвращает authentication headers.
 * 
 * Это позволяет:
 * - Хранить builder credentials только на сервере (безопасно)
 * - Автоматически атрибутировать все ордера на builder account
 * - Получать комиссии от всех трейдов пользователей
 */
export async function POST(request: NextRequest) {
  try {
    // Проверяем что credentials настроены
    if (!BUILDER_CREDENTIALS.key || !BUILDER_CREDENTIALS.secret || !BUILDER_CREDENTIALS.passphrase) {
      console.error('Missing Polymarket builder credentials in environment variables');
      return NextResponse.json(
        { error: 'Builder credentials not configured' },
        { status: 500 }
      );
    }

    // Парсим тело запроса от CLOB SDK
    const { method, path, body } = await request.json();

    if (!method || !path) {
      return NextResponse.json(
        { error: 'Missing required fields: method, path' },
        { status: 400 }
      );
    }

    // Генерируем timestamp (Unix timestamp в миллисекундах)
    const timestamp = Date.now().toString();

    // Генерируем HMAC подпись используя builder secret
    // Это подтверждает Polymarket что запрос от нашего builder account
    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(timestamp),
      method,
      path,
      body || ''
    );

    // Возвращаем authentication headers
    // SDK автоматически прикрепит их к запросу в CLOB
    const headers = {
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: timestamp,
      POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
      POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
    };

    console.log('✅ Generated builder signature for:', { method, path });

    return NextResponse.json(headers);
  } catch (error) {
    console.error('❌ Error in /sign endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
}
