# ⚡ Установка - 2 минуты

## 🚀 Быстрый старт

### 1. Распакуй
```bash
tar -xzf flarifyapp-clean.tar.gz
cd flarifyapp-clean
```

### 2. Установи (БЕЗ --legacy-peer-deps!)
```bash
npm install
```

✅ **Ожидаемый результат:**
- Установка займёт 20-30 секунд
- Никаких ошибок
- Никаких warning'ов о peer dependencies
- Никаких deprecated пакетов

❌ **Если видишь ошибки:**
Что-то пошло не так, напиши мне.

### 3. Запусти
```bash
npm run dev
```

✅ **Ожидаемый результат:**
```
  ▲ Next.js 16.1.3
  - Local:        http://localhost:3000
  - Experiments:  turbopack

 ✓ Starting...
 ✓ Ready in 1.2s
```

### 4. Открой
```
http://localhost:3000
```

✅ **Ожидаемый результат:**
- Видишь главную страницу
- 3 поста
- Можешь кликать лайки
- Можешь открывать форму ставок
- Можешь писать комментарии

---

## ✅ Checklist

После установки проверь:

- [ ] `npm install` прошёл без ошибок
- [ ] `npm run dev` запустился
- [ ] Страница открывается на localhost:3000
- [ ] Видишь 3 mock поста
- [ ] Лайки работают (счётчик меняется)
- [ ] Форма ставок открывается
- [ ] Комментарии работают

---

## 📦 Что установилось?

```json
{
  "next": "16.1.3",           // Next.js
  "react": "19.0.0",          // React
  "react-dom": "19.0.0",      // React DOM
  "lucide-react": "0.263.1",  // Иконки
  "clsx": "2.1.0",            // Утилиты для className
  "tailwind-merge": "2.2.0",  // Merge Tailwind классов
  "date-fns": "3.0.0"         // Форматирование дат
}
```

**Всего: 6 зависимостей**

---

## 🐛 Troubleshooting

### Port 3000 занят?
```bash
npm run dev -- -p 3001
```

### Ошибки при установке?
```bash
# Удали и переустанови
rm -rf node_modules package-lock.json
npm install
```

### Turbopack не работает?
```bash
# Используй обычный режим
npm run dev
```

### Всё сломалось?
```bash
# Начни заново
cd ..
rm -rf flarifyapp-clean
tar -xzf flarifyapp-clean.tar.gz
cd flarifyapp-clean
npm install
npm run dev
```

---

## 🎉 Готово!

Если всё работает - переходи к README.md для дальнейших шагов.

Если что-то не работает - напиши мне с текстом ошибки.
