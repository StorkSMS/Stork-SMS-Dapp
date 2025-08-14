"use client"

import Image from "next/image"

export default function TermsPage() {
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
          className="relative w-full max-w-3xl bg-white shadow-2xl border-2 border-black"
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
              TERMS OF SERVICE
            </h1>

            <div 
              className="space-y-6 text-black"
              style={{ fontFamily: '"Helvetica Neue", sans-serif', fontSize: '14px', lineHeight: '1.8' }}
            >
              <p className="text-sm text-gray-600">
                Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section>
                <h2 className="mb-3 text-xl font-bold">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using Stork SMS ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. We reserve the right to update these Terms at any time, and your continued use of the Service constitutes acceptance of such changes.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">2. Description of Service</h2>
                <p>
                  Stork SMS is a decentralized messaging platform built on the Solana blockchain that enables secure, encrypted communication between users. The Service includes:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>NFT-based chat access tokens</li>
                  <li>End-to-end encrypted messaging</li>
                  <li>Multi-media message support</li>
                  <li>Wallet-based authentication</li>
                  <li>Real-time message delivery</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">3. User Accounts</h2>
                <p>
                  To use the Service, you must connect a compatible Solana wallet. You are responsible for:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Maintaining the security of your wallet and private keys</li>
                  <li>All activities that occur under your wallet address</li>
                  <li>Any losses incurred due to unauthorized access to your wallet</li>
                  <li>Ensuring you have sufficient SOL for transaction fees</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">4. NFT Creation and Ownership</h2>
                <p>
                  Each conversation in Stork SMS creates unique NFTs that serve as access tokens. By using the Service:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>You acknowledge that NFT creation requires blockchain transaction fees</li>
                  <li>You retain ownership of NFTs created through your interactions</li>
                  <li>You understand that NFT transfers may affect message access</li>
                  <li>You accept that blockchain transactions are irreversible</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">5. Acceptable Use</h2>
                <p>
                  You agree not to use the Service to:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Violate any laws or regulations</li>
                  <li>Send spam, malware, or harmful content</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Impersonate others or provide false information</li>
                  <li>Attempt to gain unauthorized access to the Service</li>
                  <li>Interfere with or disrupt the Service's operation</li>
                  <li>Engage in any activity that violates these Terms</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">6. Privacy and Data</h2>
                <p>
                  Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>The collection and use of data as described in our Privacy Policy</li>
                  <li>The storage of encrypted messages on our infrastructure</li>
                  <li>The public nature of blockchain transactions</li>
                  <li>The use of cookies and similar technologies</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">7. Intellectual Property</h2>
                <p>
                  The Service and its original content (excluding user-generated content) are and will remain the exclusive property of Stork SMS and its licensors. The Service is protected by copyright, trademark, and other intellectual property laws. You may not:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Copy, modify, or distribute the Service's software</li>
                  <li>Use our trademarks without written permission</li>
                  <li>Reverse engineer or attempt to extract source code</li>
                  <li>Remove any proprietary notices or labels</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">8. User Content</h2>
                <p>
                  You retain ownership of content you send through the Service. By using the Service, you grant us a limited license to:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Store and transmit your encrypted messages</li>
                  <li>Display your wallet address to other users as necessary</li>
                  <li>Process your content to provide the Service</li>
                </ul>
                <p className="mt-3">
                  You are solely responsible for your content and the consequences of sending it.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">9. Disclaimers and Warranties</h2>
                <p>
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Merchantability or fitness for a particular purpose</li>
                  <li>Non-infringement of third-party rights</li>
                  <li>Availability, reliability, or accuracy of the Service</li>
                  <li>Security or error-free operation</li>
                </ul>
                <p className="mt-3">
                  We do not guarantee that the Service will meet your requirements or be uninterrupted, timely, or secure.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">10. Limitation of Liability</h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, STORK SMS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Loss of profits, data, or use</li>
                  <li>Wallet security breaches or loss of funds</li>
                  <li>Service interruptions or errors</li>
                  <li>Unauthorized access to your communications</li>
                  <li>Third-party actions or content</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">11. Indemnification</h2>
                <p>
                  You agree to indemnify, defend, and hold harmless Stork SMS, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, or expenses arising from:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Your use of the Service</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any third-party rights</li>
                  <li>Your content or communications</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">12. Termination</h2>
                <p>
                  We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Your right to use the Service will cease immediately</li>
                  <li>We may delete your data in accordance with our policies</li>
                  <li>NFTs you own will remain on the blockchain</li>
                  <li>Provisions that should survive termination will remain in effect</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">13. Governing Law</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">14. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. If we make material changes, we will notify users through the Service or other means. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">15. Contact Information</h2>
                <p>
                  If you have any questions about these Terms, please contact us at:
                </p>
                <p className="mt-3">
                  Stork SMS<br />
                  Email: info@stork-sms.net<br />
                  Twitter: @StorkSMS<br />
                  Website: dapp.stork-sms.net
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">16. Entire Agreement</h2>
                <p>
                  These Terms, together with our Privacy Policy and any other legal notices published on the Service, constitute the entire agreement between you and Stork SMS regarding the use of the Service.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}