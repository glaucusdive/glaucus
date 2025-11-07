# Environment Setup

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OpenRouter API Configuration
# Get your API key from: https://openrouter.ai/keys
NUXT_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## Getting an OpenRouter API Key

1. Visit [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up or log in to your account
3. Create a new API key
4. Copy the key and add it to your `.env` file as `NUXT_OPENROUTER_API_KEY`

## Cost Information

The AI search feature uses OpenAI's GPT-5 Mini model via OpenRouter:
- Input: $0.25 per million tokens
- Output: $2.00 per million tokens
- Web search: $10 per 1000 searches (not currently used)

Typical conversation costs are minimal (a few cents per search session).

