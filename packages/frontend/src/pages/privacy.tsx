import { LegalPage } from '@/components/legal/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      intro="This notice explains the limited information used by LaunchBNB to operate wallet verification, creator access checks, and payment storage for the demo platform."
      sections={[
        {
          title: 'Information processed',
          paragraphs: [
            'The platform may process wallet addresses, signed verification messages, creator-access status, payment-order references, and technical request metadata needed to operate the app.',
            'Server-side storage may persist creator payment and access records through Prisma and PostgreSQL when PAYMENT_STORAGE=database is enabled.',
          ],
        },
        {
          title: 'Purpose of use',
          paragraphs: [
            'Information is used to verify wallet ownership, check creator access, support payment verification in demo mode, protect platform integrity, and troubleshoot failures.',
            'The platform is not designed to collect sensitive personal information beyond what is required for the current demo and operational flows.',
          ],
        },
        {
          title: 'Third-party services',
          paragraphs: [
            'LaunchBNB depends on third-party wallet software, blockchain RPC providers, hosting, and database services. Their processing practices apply to the portions of activity they handle.',
            'Future live payment or compliance integrations may require additional disclosures. SMEPay integration is pending official API endpoint and webhook documentation and is not live in the current demo flow.',
          ],
        },
        {
          title: 'Security and limits',
          paragraphs: [
            'Reasonable efforts are made to avoid exposing secrets and to keep server errors safe, but no online system can guarantee absolute security or uninterrupted availability.',
            'Do not store private keys, seed phrases, or unrelated secrets in platform forms, token metadata, or support channels.',
          ],
        },
      ]}
    />
  );
}
