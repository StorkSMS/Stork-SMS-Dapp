"use client"

import Image from "next/image"

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/Light-1-min.webp"
          alt="Background"
          fill
          priority
          className="object-cover"
          quality={100}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-8">
        <div 
          className="relative w-full max-w-3xl bg-white shadow-2xl"
          style={{
            backgroundImage: `url("/Nft-Build-Images/Recipient NFT/Paper-Texture (position bottom right).png")`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            maxHeight: '85vh',
            aspectRatio: '210 / 297', // A4 aspect ratio
          }}
        >
          {/* Content */}
          <div className="relative h-full overflow-y-auto px-12 py-10">
            <h1 
              className="mb-8 text-4xl font-bold text-black"
              style={{ fontFamily: '"Helvetica Neue", sans-serif' }}
            >
              PRIVACY POLICY
            </h1>

            <div 
              className="space-y-6 text-black"
              style={{ fontFamily: '"Helvetica Neue", sans-serif', fontSize: '14px', lineHeight: '1.8' }}
            >
              <p className="text-sm text-gray-600">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section>
                <h2 className="mb-3 text-xl font-bold">1. Introduction</h2>
                <p>
                  Stork SMS ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our decentralized messaging application built on the Solana blockchain.
                </p>
                <p className="mt-3">
                  By using Stork SMS, you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">2. Information We Collect</h2>
                <p>
                  We collect information that you provide directly to us and information that is automatically collected when you use our Service:
                </p>
                
                <h3 className="mb-2 mt-4 font-bold">Information You Provide:</h3>
                <ul className="ml-6 list-disc">
                  <li>Wallet address (public key)</li>
                  <li>Message content (stored encrypted)</li>
                  <li>Media files (images, voice messages)</li>
                  <li>Profile information you choose to share</li>
                  <li>Transaction signatures for authentication</li>
                </ul>

                <h3 className="mb-2 mt-4 font-bold">Automatically Collected Information:</h3>
                <ul className="ml-6 list-disc">
                  <li>Device information (browser type, operating system)</li>
                  <li>IP address (for service delivery)</li>
                  <li>Usage data (features used, interaction patterns)</li>
                  <li>Blockchain transaction data (publicly visible)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">3. How We Use Your Information</h2>
                <p>
                  We use the collected information for the following purposes:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>To provide and maintain the messaging service</li>
                  <li>To authenticate users via wallet signatures</li>
                  <li>To create and manage NFT-based chat access</li>
                  <li>To deliver and store encrypted messages</li>
                  <li>To improve and optimize our Service</li>
                  <li>To prevent fraud and enhance security</li>
                  <li>To comply with legal obligations</li>
                  <li>To send service-related notifications</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">4. Data Storage and Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your information:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>End-to-end encryption (AES-256-GCM) for all messages</li>
                  <li>Encrypted storage on Supabase infrastructure</li>
                  <li>Media files stored on Cloudflare R2 with access controls</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to user data by authorized personnel only</li>
                </ul>
                <p className="mt-3">
                  However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">5. Blockchain Data</h2>
                <p>
                  Please note that certain information is recorded on the Solana blockchain and is publicly visible:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Wallet addresses involved in transactions</li>
                  <li>NFT creation and transfer records</li>
                  <li>Transaction timestamps and fees</li>
                  <li>Smart contract interactions</li>
                </ul>
                <p className="mt-3">
                  This blockchain data is immutable and cannot be deleted or modified once recorded.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">6. Data Retention</h2>
                <p>
                  We retain your information for as long as necessary to provide the Service and fulfill the purposes outlined in this policy:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Encrypted messages are retained until deleted by users</li>
                  <li>Media files are retained for 30 days after last access</li>
                  <li>Account data is retained while your wallet is active</li>
                  <li>Blockchain data is permanent and immutable</li>
                  <li>We may retain certain data to comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">7. Data Sharing and Disclosure</h2>
                <p>
                  We do not sell, trade, or rent your personal information. We may share your information in the following circumstances:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>With your consent or at your direction</li>
                  <li>To comply with legal obligations or court orders</li>
                  <li>To protect our rights, property, or safety</li>
                  <li>With service providers who assist in operating our Service</li>
                  <li>In connection with a merger, acquisition, or sale of assets</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">8. Third-Party Services</h2>
                <p>
                  Our Service integrates with third-party services that have their own privacy policies:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Solana blockchain network</li>
                  <li>Wallet providers (Phantom, Solflare, etc.)</li>
                  <li>Supabase (database and authentication)</li>
                  <li>Cloudflare R2 (media storage)</li>
                  <li>Metaplex (NFT standards)</li>
                </ul>
                <p className="mt-3">
                  We encourage you to review the privacy policies of these third-party services.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">9. Cookies and Tracking</h2>
                <p>
                  We use cookies and similar tracking technologies to:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Maintain user sessions</li>
                  <li>Remember user preferences</li>
                  <li>Analyze usage patterns</li>
                  <li>Improve service performance</li>
                </ul>
                <p className="mt-3">
                  You can control cookies through your browser settings, but disabling them may limit certain features of the Service.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">10. Your Rights and Choices</h2>
                <p>
                  Depending on your location, you may have certain rights regarding your personal information:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Access to your personal information</li>
                  <li>Correction of inaccurate data</li>
                  <li>Deletion of your data (where technically feasible)</li>
                  <li>Data portability</li>
                  <li>Objection to certain processing</li>
                  <li>Withdrawal of consent</li>
                </ul>
                <p className="mt-3">
                  Note that blockchain data cannot be modified or deleted due to its immutable nature.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">11. Children's Privacy</h2>
                <p>
                  Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that we have collected information from a child under 13, we will take steps to delete such information.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">12. International Data Transfers</h2>
                <p>
                  Your information may be transferred to and processed in countries other than your own. These countries may have different data protection laws. By using our Service, you consent to such transfers.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">13. California Privacy Rights</h2>
                <p>
                  If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>The right to know what personal information we collect</li>
                  <li>The right to delete personal information</li>
                  <li>The right to opt-out of the sale of personal information</li>
                  <li>The right to non-discrimination</li>
                </ul>
                <p className="mt-3">
                  We do not sell personal information to third parties.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">14. European Privacy Rights</h2>
                <p>
                  If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>The right to access your personal data</li>
                  <li>The right to rectification</li>
                  <li>The right to erasure</li>
                  <li>The right to restrict processing</li>
                  <li>The right to data portability</li>
                  <li>The right to object</li>
                  <li>Rights related to automated decision-making</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">15. Data Breach Notification</h2>
                <p>
                  In the event of a data breach that may affect your personal information, we will notify affected users as required by applicable law. Notifications will be sent via the Service or to any contact information you have provided.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">16. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">17. Contact Us</h2>
                <p>
                  If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="mt-3">
                  Stork SMS<br />
                  Email: info@stork-sms.net<br />
                  Twitter: @StorkSMS<br />
                  Website: dapp.stork-sms.net
                </p>
                <p className="mt-3">
                  For data protection inquiries, please use the subject line "Privacy Inquiry" in your email.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}