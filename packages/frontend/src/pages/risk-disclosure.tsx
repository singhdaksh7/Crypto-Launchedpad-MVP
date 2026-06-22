import { LegalPage } from '@/components/legal/LegalPage';

export default function RiskDisclosurePage() {
  return (
    <LegalPage
      title="Risk Disclosure"
      intro="Using a crypto launchpad, joining a token presale, or deploying smart-contract based assets involves significant risk. Review these points carefully before using the platform."
      sections={[
        {
          title: 'Crypto asset risk',
          paragraphs: [
            'Crypto assets are volatile and can lose substantial or all value. Market demand, liquidity, pricing, and trading conditions can change rapidly and without warning.',
            'No token listed, created, or discussed on LaunchBNB should be treated as safe, endorsed, profitable, or suitable for any user.',
          ],
        },
        {
          title: 'Smart contract risk',
          paragraphs: [
            'Smart contracts may contain bugs, design flaws, integration issues, or unintended behavior. Even when contract logic is visible on-chain, it may still fail or behave differently than a user expects.',
            'Users should independently review addresses, transaction prompts, and contract interactions before signing.',
          ],
        },
        {
          title: 'Wallet and provider risk',
          paragraphs: [
            'Wallet software, browser extensions, RPC providers, and payment providers are third-party systems. They may fail, go offline, delay transactions, or display incomplete information.',
            'A compromised device, wallet, browser, or signing flow can result in irreversible loss.',
          ],
        },
        {
          title: 'Testnet and mainnet distinction',
          paragraphs: [
            'BSC Testnet is for testing and demonstration. Testnet assets are not real-value assets and should not be confused with mainnet balances or production readiness.',
            'Moving from testnet to mainnet materially changes operational, legal, financial, and security risk. Treat production launch decisions separately from demo testing results.',
          ],
        },
      ]}
    />
  );
}
