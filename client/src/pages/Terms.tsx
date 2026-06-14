import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  Scale,
  Shield,
  AlertTriangle,
  Clock,
  CreditCard,
  Ban,
  Mail,
} from "lucide-react";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";

export default function Terms() {
  const { t } = useTranslation();
  const lastUpdated = "16. desember 2024";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              Stylora
            </span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("terms.backToHome")}
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container py-12 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t("terms.title")}</h1>
              <p className="text-muted-foreground">
                {t("terms.lastUpdated", { date: lastUpdated })}
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* Introduction */}
          <section className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <p className="text-lg leading-relaxed m-0">
              {t("terms.intro.before")}{" "}
              <strong>Nexify CRM Systems AS</strong> {t("terms.intro.after")}
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">{t("terms.section1.heading")}</h2>
            </div>
            <div className="bg-white rounded-lg border p-4 space-y-2">
              <p>
                <strong>{t("terms.section1.serviceTerm")}</strong> {t("terms.section1.serviceDef")}
              </p>
              <p>
                <strong>{t("terms.section1.userTerm")}</strong> {t("terms.section1.userDef")}
              </p>
              <p>
                <strong>{t("terms.section1.subscriptionTerm")}</strong> {t("terms.section1.subscriptionDef")}
              </p>
              <p>
                <strong>{t("terms.section1.customerDataTerm")}</strong> {t("terms.section1.customerDataDef")}
              </p>
              <p>
                <strong>{t("terms.section1.providerTerm")}</strong> {t("terms.section1.providerDef")}
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">{t("terms.section2.heading")}</h2>
            </div>
            <p>{t("terms.section2.intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("terms.section2.item1")}</li>
              <li>{t("terms.section2.item2")}</li>
              <li>{t("terms.section2.item3")}</li>
              <li>{t("terms.section2.item4")}</li>
              <li>{t("terms.section2.item5")}</li>
              <li>{t("terms.section2.item6")}</li>
              <li>{t("terms.section2.item7")}</li>
            </ul>
            <p className="mt-4">
              {t("terms.section2.outro")}
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">
                {t("terms.section3.heading")}
              </h2>
            </div>

            <h3 className="text-lg font-semibold mt-4">{t("terms.section3.sub1Heading")}</h3>
            <p>
              {t("terms.section3.sub1Body")}
            </p>

            <h3 className="text-lg font-semibold mt-4">{t("terms.section3.sub2Heading")}</h3>
            <p>
              {t("terms.section3.sub2Body")}
            </p>

            <h3 className="text-lg font-semibold mt-4">{t("terms.section3.sub3Heading")}</h3>
            <p>
              {t("terms.section3.sub3Body")}
            </p>

            <h3 className="text-lg font-semibold mt-4">{t("terms.section3.sub4Heading")}</h3>
            <p>
              {t("terms.section3.sub4Body")}
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">
                {t("terms.section4.heading")}
              </h2>
            </div>

            <h3 className="text-lg font-semibold mt-4">
              {t("terms.section4.sub1Heading")}
            </h3>
            <p>
              {t("terms.section4.sub1Body")}
            </p>

            <h3 className="text-lg font-semibold mt-4">
              {t("terms.section4.sub2Heading")}
            </h3>
            <p>
              {t("terms.section4.sub2Body")}
            </p>

            <h3 className="text-lg font-semibold mt-4">{t("terms.section4.sub3Heading")}</h3>
            <p>
              {t("terms.section4.sub3Body")}
            </p>

            <h3 className="text-lg font-semibold mt-4">{t("terms.section4.sub4Heading")}</h3>
            <p>
              {t("terms.section4.sub4Body")}
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Ban className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">
                {t("terms.section5.heading")}
              </h2>
            </div>
            <p>{t("terms.section5.intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("terms.section5.item1")}</li>
              <li>{t("terms.section5.item2")}</li>
              <li>{t("terms.section5.item3")}</li>
              <li>
                {t("terms.section5.item4")}
              </li>
              <li>{t("terms.section5.item5")}</li>
              <li>
                {t("terms.section5.item6")}
              </li>
              <li>
                {t("terms.section5.item7")}
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">
                {t("terms.section6.heading")}
              </h2>
            </div>
            <p>
              {t("terms.section6.introBefore")}{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                {t("terms.section6.privacyLink")}
              </Link>
              {t("terms.section6.introAfter")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                {t("terms.section6.item1")}
              </li>
              <li>{t("terms.section6.item2")}</li>
              <li>{t("terms.section6.item3")}</li>
              <li>
                {t("terms.section6.item4")}
              </li>
              <li>{t("terms.section6.item5")}</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">{t("terms.section7.heading")}</h2>
            </div>

            <h3 className="text-lg font-semibold mt-4">{t("terms.section7.sub1Heading")}</h3>
            <p>
              {t("terms.section7.sub1Body")}
            </p>

            <h3 className="text-lg font-semibold mt-4">
              {t("terms.section7.sub2Heading")}
            </h3>
            <p>
              {t("terms.section7.sub2Body")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("terms.section7.item1")}</li>
              <li>{t("terms.section7.item2")}</li>
              <li>
                {t("terms.section7.item3")}
              </li>
              <li>{t("terms.section7.item4")}</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">{t("terms.section7.sub3Heading")}</h3>
            <p>
              {t("terms.section7.sub3Body")}
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">
                {t("terms.section8.heading")}
              </h2>
            </div>
            <p>
              {t("terms.section8.body1")}
            </p>
            <p className="mt-4">
              {t("terms.section8.body2")}
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Ban className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">{t("terms.section9.heading")}</h2>
            </div>
            <p>
              {t("terms.section9.intro")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("terms.section9.item1")}</li>
              <li>{t("terms.section9.item2")}</li>
              <li>{t("terms.section9.item3")}</li>
              <li>{t("terms.section9.item4")}</li>
            </ul>
            <p className="mt-4">
              {t("terms.section9.outro")}
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">
                {t("terms.section10.heading")}
              </h2>
            </div>
            <p>
              {t("terms.section10.body")}
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">
                {t("terms.section11.heading")}
              </h2>
            </div>
            <p>
              {t("terms.section11.body")}
            </p>
          </section>

          {/* Contact */}
          <section className="bg-slate-50 rounded-xl p-6 border">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">{t("terms.section12.heading")}</h2>
            </div>
            <p className="mb-4">
              {t("terms.section12.intro")}
            </p>
            <div className="bg-white rounded-lg border p-4 space-y-2">
              <p>
                <strong>Nexify CRM Systems AS</strong>
              </p>
              <p>{t("terms.section12.orgNumber", { number: "936 300 278" })}</p>
              <p>
                {t("terms.section12.emailLabel")}{" "}
                <a
                  href="mailto:support@stylora.no"
                  className="text-blue-600 hover:underline"
                >
                  support@stylora.no
                </a>
              </p>
              <p>
                {t("terms.section12.websiteLabel")}{" "}
                <a
                  href="https://stylora.no"
                  className="text-blue-600 hover:underline"
                >
                  stylora.no
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Back to top */}
        <div className="mt-12 text-center">
          <Link href="/privacy">
            <Button variant="outline" className="mr-4">
              {t("terms.readPrivacyPolicy")}
            </Button>
          </Link>
          <Link href="/">
            <Button>{t("terms.backToHome")}</Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
