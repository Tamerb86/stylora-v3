import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Shield,
  Database,
  Eye,
  Lock,
  UserX,
  Globe,
  Mail,
  Clock,
  FileText,
} from "lucide-react";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";

export default function Privacy() {
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
              {t("privacy.backToHome")}
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container py-12 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t("privacy.title")}</h1>
              <p className="text-muted-foreground">
                {t("privacy.lastUpdated", { date: lastUpdated })}
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* Introduction */}
          <section className="bg-green-50 rounded-xl p-6 border border-green-100">
            <p className="text-lg leading-relaxed m-0">
              Denne personvernerklæringen beskriver hvordan{" "}
              <strong>Nexify CRM Systems AS</strong>
              (org.nr. 936 300 278), heretter kalt "vi" eller "Stylora", samler
              inn, bruker, lagrer og beskytter personopplysninger i forbindelse
              med vår tjeneste. Vi er opptatt av å beskytte ditt personvern og
              behandler alle data i samsvar med EUs personvernforordning (GDPR)
              og norsk personopplysningslov.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">{t("privacy.section1Title")}</h2>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p>
                <strong>Nexify CRM Systems AS</strong>
              </p>
              <p>{t("privacy.orgNumber", { number: "936 300 278" })}</p>
              <p>
                E-post:{" "}
                <a
                  href="mailto:personvern@stylora.no"
                  className="text-green-600 hover:underline"
                >
                  personvern@stylora.no
                </a>
              </p>
              <p className="mt-4">{t("privacy.section1Body")}</p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">
                {t("privacy.section2Title")}
              </h2>
            </div>

            <h3 className="text-lg font-semibold mt-4">
              {t("privacy.section2_1Title")}
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.section2_1Item1")}</li>
              <li>{t("privacy.section2_1Item2")}</li>
              <li>{t("privacy.section2_1Item3")}</li>
              <li>{t("privacy.section2_1Item4")}</li>
              <li>{t("privacy.section2_1Item5")}</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">
              {t("privacy.section2_2Title")}
            </h3>
            <p>{t("privacy.section2_2Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.section2_2Item1")}</li>
              <li>{t("privacy.section2_2Item2")}</li>
              <li>{t("privacy.section2_2Item3")}</li>
              <li>{t("privacy.section2_2Item4")}</li>
              <li>{t("privacy.section2_2Item5")}</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">{t("privacy.section2_3Title")}</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.section2_3Item1")}</li>
              <li>{t("privacy.section2_3Item2")}</li>
              <li>{t("privacy.section2_3Item3")}</li>
              <li>{t("privacy.section2_3Item4")}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">
                {t("privacy.section3Title")}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-3 border-b">{t("privacy.purposeHeader")}</th>
                    <th className="text-left p-3 border-b">
                      {t("privacy.legalBasisHeader")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border-b">
                      {t("privacy.purpose1")}
                    </td>
                    <td className="p-3 border-b">{t("privacy.legalBasis1")}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">{t("privacy.purpose2")}</td>
                    <td className="p-3 border-b">
                      {t("privacy.legalBasis2")}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">{t("privacy.purpose3")}</td>
                    <td className="p-3 border-b">
                      {t("privacy.legalBasis3")}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">{t("privacy.purpose4")}</td>
                    <td className="p-3 border-b">
                      {t("privacy.legalBasis4")}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">
                      {t("privacy.purpose5")}
                    </td>
                    <td className="p-3 border-b">
                      {t("privacy.legalBasis5")}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">
                      {t("privacy.purpose6")}
                    </td>
                    <td className="p-3 border-b">
                      {t("privacy.legalBasis6")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">
                {t("privacy.section4Title")}
              </h2>
            </div>
            <p>{t("privacy.section4Intro")}</p>

            <h3 className="text-lg font-semibold mt-4">
              {t("privacy.section4_1Title")}
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Skyinfrastruktur:</strong> Amazon Web Services (AWS) -
                EU-region
              </li>
              <li>
                <strong>Betalingsbehandling:</strong> Stripe, Vipps
              </li>
              <li>
                <strong>SMS-tjenester:</strong> PSWinCom, Link Mobility
              </li>
              <li>
                <strong>E-posttjenester:</strong> Amazon SES
              </li>
            </ul>
            <p className="mt-4">{t("privacy.section4_1Note")}</p>

            <h3 className="text-lg font-semibold mt-4">
              {t("privacy.section4_2Title")}
            </h3>
            <p>{t("privacy.section4_2Body")}</p>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">{t("privacy.section5Title")}</h2>
            </div>
            <p>{t("privacy.section5Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Kryptering:</strong> All dataoverføring skjer via
                HTTPS/TLS
              </li>
              <li>
                <strong>Passord:</strong> Lagres med bcrypt-hashing (aldri i
                klartekst)
              </li>
              <li>
                <strong>Tilgangskontroll:</strong> Rollebasert tilgang og minste
                privilegiums prinsipp
              </li>
              <li>
                <strong>Logging:</strong> Alle kritiske handlinger logges for
                revisjon
              </li>
              <li>
                <strong>Backup:</strong> Regelmessige sikkerhetskopier med
                kryptering
              </li>
              <li>
                <strong>Servere:</strong> Alle data lagres på sikre servere i
                EU/EØS
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">{t("privacy.section6Title")}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-3 border-b">{t("privacy.dataTypeHeader")}</th>
                    <th className="text-left p-3 border-b">{t("privacy.retentionHeader")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border-b">{t("privacy.dataType1")}</td>
                    <td className="p-3 border-b">
                      {t("privacy.retention1")}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">{t("privacy.dataType2")}</td>
                    <td className="p-3 border-b">{t("privacy.retention2")}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">{t("privacy.dataType3")}</td>
                    <td className="p-3 border-b">
                      {t("privacy.retention3")}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">{t("privacy.dataType4")}</td>
                    <td className="p-3 border-b">{t("privacy.retention4")}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">{t("privacy.dataType5")}</td>
                    <td className="p-3 border-b">
                      {t("privacy.retention5")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 7 - GDPR Rights */}
          <section className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <UserX className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold m-0">
                {t("privacy.section7Title")}
              </h2>
            </div>
            <p className="mb-4">{t("privacy.section7Intro")}</p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-blue-600">{t("privacy.rightAccessTitle")}</h4>
                <p className="text-sm">
                  {t("privacy.rightAccessBody")}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-blue-600">
                  {t("privacy.rightRectificationTitle")}
                </h4>
                <p className="text-sm">
                  {t("privacy.rightRectificationBody")}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-blue-600">
                  {t("privacy.rightErasureTitle")}
                </h4>
                <p className="text-sm">
                  {t("privacy.rightErasureBody")}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-blue-600">
                  {t("privacy.rightPortabilityTitle")}
                </h4>
                <p className="text-sm">
                  {t("privacy.rightPortabilityBody")}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-blue-600">
                  {t("privacy.rightObjectTitle")}
                </h4>
                <p className="text-sm">
                  {t("privacy.rightObjectBody")}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-blue-600">
                  {t("privacy.rightRestrictionTitle")}
                </h4>
                <p className="text-sm">
                  {t("privacy.rightRestrictionBody")}
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border-2 border-blue-200">
              <h4 className="font-semibold mb-2">
                {t("privacy.exerciseRightsTitle")}
              </h4>
              <p className="text-sm mb-3">
                Send en forespørsel til{" "}
                <a
                  href="mailto:personvern@stylora.no"
                  className="text-blue-600 hover:underline"
                >
                  personvern@stylora.no
                </a>
                eller bruk "Slett mine data"-funksjonen i innstillingene. Vi
                svarer innen 30 dager.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>For sluttkunder av salonger:</strong> Kontakt salongen
                direkte, da de er behandlingsansvarlig for dine data.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">
                {t("privacy.section8Title")}
              </h2>
            </div>
            <p>{t("privacy.section8Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.section8Item1")}</li>
              <li>{t("privacy.section8Item2")}</li>
              <li>{t("privacy.section8Item3")}</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">
                {t("privacy.section9Title")}
              </h2>
            </div>
            <p>{t("privacy.section9Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Nødvendige:</strong> For pålogging og sikkerhet (krever
                ikke samtykke)
              </li>
              <li>
                <strong>Funksjonelle:</strong> For å huske preferanser
              </li>
              <li>
                <strong>Analytiske:</strong> For å forstå bruksmønstre
                (anonymisert)
              </li>
            </ul>
            <p className="mt-4">{t("privacy.section9Note")}</p>
          </section>

          {/* Section 10 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">
                {t("privacy.section10Title")}
              </h2>
            </div>
            <p>{t("privacy.section10Body")}</p>
          </section>

          {/* Section 11 - Complaints */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">{t("privacy.section11Title")}</h2>
            </div>
            <p>{t("privacy.section11Intro")}</p>
            <div className="bg-white rounded-lg border p-4 mt-4">
              <p>
                <strong>Datatilsynet</strong>
              </p>
              <p>Postboks 458 Sentrum</p>
              <p>0105 Oslo</p>
              <p>{t("privacy.phoneLabel", { phone: "22 39 69 00" })}</p>
              <p>
                E-post:{" "}
                <a
                  href="mailto:postkasse@datatilsynet.no"
                  className="text-green-600 hover:underline"
                >
                  postkasse@datatilsynet.no
                </a>
              </p>
              <p>
                Nettside:{" "}
                <a
                  href="https://www.datatilsynet.no"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline"
                >
                  www.datatilsynet.no
                </a>
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-slate-50 rounded-xl p-6 border">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold m-0">{t("privacy.section12Title")}</h2>
            </div>
            <p className="mb-4">{t("privacy.section12Intro")}</p>
            <div className="bg-white rounded-lg border p-4 space-y-2">
              <p>
                <strong>Nexify CRM Systems AS</strong>
              </p>
              <p>{t("privacy.orgNumber", { number: "936 300 278" })}</p>
              <p>
                E-post for personvern:{" "}
                <a
                  href="mailto:personvern@stylora.no"
                  className="text-green-600 hover:underline"
                >
                  personvern@stylora.no
                </a>
              </p>
              <p>
                Generell support:{" "}
                <a
                  href="mailto:support@stylora.no"
                  className="text-green-600 hover:underline"
                >
                  support@stylora.no
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Back to top */}
        <div className="mt-12 text-center">
          <Link href="/terms">
            <Button variant="outline" className="mr-4">
              {t("privacy.readTerms")}
            </Button>
          </Link>
          <Link href="/">
            <Button>{t("privacy.backToHome")}</Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
