"use client"

import Image from "next/image"

export default function CopyrightPage() {
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
              COPYRIGHT NOTICE
            </h1>

            <div 
              className="space-y-6 text-black"
              style={{ fontFamily: '"Helvetica Neue", sans-serif', fontSize: '14px', lineHeight: '1.8' }}
            >
              <p>
                © 2025 Stork SMS. All rights reserved.
              </p>

              <section>
                <h2 className="mb-3 text-xl font-bold">Ownership</h2>
                <p>
                  This application, including all content, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by Stork SMS, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">License and Restrictions</h2>
                <p>
                  Stork SMS is proprietary software. All rights reserved. The software and its source code are the exclusive property of Stork SMS and are protected by copyright laws and international treaties.
                </p>
                <p className="mt-3">
                  <strong>You are NOT permitted to:</strong>
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>Copy, reproduce, or duplicate the software or source code</li>
                  <li>Modify, adapt, or create derivative works</li>
                  <li>Distribute, sell, rent, lease, or sublicense the software</li>
                  <li>Reverse engineer, decompile, or disassemble the software</li>
                  <li>Remove or alter any proprietary notices or labels</li>
                  <li>Use the software for commercial purposes without explicit written permission</li>
                </ul>
                <p className="mt-3">
                  <strong>Limited Use License:</strong> Users are granted a limited, non-exclusive, non-transferable license to use the Stork SMS application solely for personal, non-commercial purposes through the official deployed application at dapp.stork-sms.net.
                </p>
                <p className="mt-3">
                  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL STORK SMS BE LIABLE FOR ANY DAMAGES ARISING FROM THE USE OF THIS SOFTWARE.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">Trademarks</h2>
                <p>
                  The Stork SMS name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of Stork SMS or its affiliates or licensors. You must not use such marks without the prior written permission of Stork SMS. All other names, logos, product and service names, designs, and slogans on this application are the trademarks of their respective owners.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">Third-Party Content</h2>
                <p>
                  This application may contain links to third-party websites or services that are not owned or controlled by Stork SMS. Stork SMS has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party websites or services.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">User-Generated Content</h2>
                <p>
                  Users retain copyright and any other rights they already hold in content which they submit, post, or display on or through the Stork SMS platform. By submitting, posting, or displaying content, users grant Stork SMS a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display, and distribute such content in any and all media or distribution methods now known or later developed.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">Copyright Infringement Claims</h2>
                <p>
                  If you believe that any content on this application violates your copyright, please contact us at:
                </p>
                <p className="mt-3">
                  Email: info@stork-sms.net<br />
                  Subject Line: "Copyright Infringement Claim"
                </p>
                <p className="mt-3">
                  Please include the following information in your claim:
                </p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>A description of the copyrighted work that you claim has been infringed</li>
                  <li>A description of where the material you claim is infringing is located</li>
                  <li>Your contact information</li>
                  <li>A statement that you have a good faith belief that the disputed use is not authorized</li>
                  <li>A statement that the information in your notice is accurate</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">Contact Information</h2>
                <p>
                  For any questions regarding this copyright notice, please contact us at:
                </p>
                <p className="mt-3">
                  Stork SMS<br />
                  Email: info@stork-sms.net<br />
                  Twitter: @StorkSMS<br />
                  Website: dapp.stork-sms.net
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold">Last Updated</h2>
                <p>
                  This copyright notice was last updated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}