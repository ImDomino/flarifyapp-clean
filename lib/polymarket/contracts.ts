/**
 * Polymarket V2 contract addresses on Polygon (chain 137).
 *
 * Source: https://docs.polymarket.com/resources/contracts
 *
 * Migration notes vs. V1:
 *   - CTF_EXCHANGE and NEG_RISK_CTF_EXCHANGE are NEW (V1 exchanges stop working after 2026-04-22).
 *   - CTF, NEG_RISK_ADAPTER are unchanged (market identity lives in the CTF).
 *   - Collateral moves from USDC.e to pUSD. USDC.e is still the ramp input asset.
 *   - Order settlement and redemption go through the new CollateralAdapter contracts.
 */

export const CHAIN_ID = 137;

export const CONTRACTS = {
  // Tokens
  USDC_E: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
  PUSD: "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB" as `0x${string}`,
  CTF: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as `0x${string}`,

  // V2 Exchanges (NEW as of 2026-04-22)
  CTF_EXCHANGE: "0xE111180000d2663C0091e4f400237545B87B996B" as `0x${string}`,
  NEG_RISK_CTF_EXCHANGE: "0xe2222d279d744050d28e00520010520000310F59" as `0x${string}`,

  // Neg risk pipeline (NEG_RISK_ADAPTER unchanged from V1)
  NEG_RISK_ADAPTER: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296" as `0x${string}`,

  // pUSD on/off-ramp
  COLLATERAL_ONRAMP: "0x93070a847efEf7F70739046A929D47a521F5B8ee" as `0x${string}`,
  COLLATERAL_OFFRAMP: "0x2957922Eb93258b93368531d39fAcCA3B4dC5854" as `0x${string}`,

  // Redemption adapters (settle positions to pUSD)
  CTF_COLLATERAL_ADAPTER: "0xADa100874d00e3331D00F2007a9c336a65009718" as `0x${string}`,
  NEG_RISK_CTF_COLLATERAL_ADAPTER: "0xAdA200001000ef00D07553cEE7006808F895c6F1" as `0x${string}`,
} as const;

export const USDC_E_DECIMALS = 6;
export const PUSD_DECIMALS = 6;

export const RPC_URLS = [
  "https://polygon-bor-rpc.publicnode.com",
  "https://rpc.ankr.com/polygon",
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
].filter(Boolean) as string[];
