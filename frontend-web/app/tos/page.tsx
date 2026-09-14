import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TosPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-[840px] px-4 py-16 lg:px-0">
        <h1 className="font-display text-4xl font-medium">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: August 2026</p>
        <div className="prose mt-8 max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="mt-2">By accessing or using the MrBuilder platform, you agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use the platform.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. The Platform</h2>
            <p className="mt-2">MrBuilder connects homeowners seeking pergola installation, maintenance, and repair services with independent contractors. MrBuilder is a marketplace and is not a party to agreements between consumers and contractors.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Accounts</h2>
            <p className="mt-2">You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate and complete information during registration.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Quotes, Payments &amp; Invoices</h2>
            <p className="mt-2">Contractors set their own prices via quotes. When a consumer accepts a quote, an invoice is generated. Payment terms and processing are described at checkout.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Warranties &amp; Claims</h2>
            <p className="mt-2">Warranties are issued by contractors for completed work. Warranty claims are reviewed on a case-by-case basis. MrBuilder may facilitate but does not guarantee warranty outcomes.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Limitation of Liability</h2>
            <p className="mt-2">To the maximum extent permitted by law, MrBuilder is not liable for any indirect, incidental, or consequential damages arising from use of the platform or services performed by contractors.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Contact</h2>
            <p className="mt-2">Questions about these terms? Contact us through the platform.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
