import { LegalPage } from '@/components/legal/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="LaunchBNB is provided as a crypto launchpad demo for wallet verification, token creation, and presale testing flows on BNB Chain. By using the platform, you agree that blockchain activity, token launches, and payment verification involve operational and financial risk."
      sections={[
        {
          title: 'Demo status',
          paragraphs: [
            'The current platform should be treated as a demo or staging environment until live payment, compliance, and operational integrations are completed. Features may change, be interrupted, or be removed without notice.',
            'Demo payment mode may simulate a one-time ₹1000 creator access fee for staging purposes. Users must not assume that a mock or staging payment flow represents a live commercial payment service.',
          ],
        },
        {
          title: 'No investment advice',
          paragraphs: [
            'Nothing on LaunchBNB is investment, legal, tax, accounting, or financial advice. The platform does not recommend any token, presale, creator, or transaction.',
            'No returns, profits, liquidity, exchange listings, or token performance are promised or guaranteed.',
          ],
        },
        {
          title: 'User responsibilities',
          paragraphs: [
            'You are responsible for your wallet, private keys, seed phrase, connected devices, transaction approvals, and the correctness of every destination address you use.',
            'Creators are responsible for all token names, symbols, supply amounts, launch materials, disclosures, and claims made to users or buyers.',
          ],
        },
        {
          title: 'Compliance and launch conduct',
          paragraphs: [
            'Creators are responsible for determining whether their token, presale, marketing, or community activity complies with applicable laws, sanctions, consumer rules, securities rules, and other local requirements.',
            'LaunchBNB may rely on third-party wallet software, node providers, or payment providers. Delays, downtime, transaction failures, and verification issues can occur outside platform control.',
          ],
        },
      ]}
    />
  );
}
