import { Button } from "@/components/ui/button";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Target,
  Users,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Mail,
  Menu,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function AboutUs() {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const values = [
    {
      icon: Heart,
      title: t("aboutUs.valueCustomerFocusTitle"),
      description: t("aboutUs.valueCustomerFocusDesc"),
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: Target,
      title: t("aboutUs.valueInnovationTitle"),
      description: t("aboutUs.valueInnovationDesc"),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      title: t("aboutUs.valuePartnershipTitle"),
      description: t("aboutUs.valuePartnershipDesc"),
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Sparkles,
      title: t("aboutUs.valueSimplicityTitle"),
      description: t("aboutUs.valueSimplicityDesc"),
      color: "from-orange-500 to-red-500",
    },
  ];

  const milestones = [
    {
      year: "2023",
      event: t("aboutUs.milestone2023"),
    },
    {
      year: "2024",
      event: t("aboutUs.milestone2024Launch"),
    },
    { year: "2024", event: t("aboutUs.milestone2024Salons") },
    {
      year: "2025",
      event: t("aboutUs.milestone2025"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-transparent"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-orange-500 flex items-center justify-center shadow-lg">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 16 4 C 16 4 18 4 18 6 C 18 8 16 8 14 8 L 10 8 C 8 8 6 8 6 10 C 6 12 8 12 10 12 L 14 12 C 16 12 18 12 18 14 C 18 16 16 16 14 16 L 10 16 C 8 16 6 16 6 18 C 6 20 8 20 8 20"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <line
                    x1="18"
                    y1="6"
                    x2="20"
                    y2="6"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="18"
                    y1="9"
                    x2="20"
                    y2="9"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="18"
                    y1="12"
                    x2="20"
                    y2="12"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="18"
                    y1="15"
                    x2="20"
                    y2="15"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="10"
                    x2="4"
                    y2="10"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="13"
                    x2="4"
                    y2="13"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="16"
                    x2="4"
                    y2="16"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent">
                Stylora
              </span>
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="hidden md:inline-flex">
                {t("aboutUs.backToHome")}
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute top-16 right-0 left-0 bg-background border-b shadow-2xl">
            <div className="container py-6 space-y-4">
              <Link href="/">
                <Button
                  variant="outline"
                  className="w-full justify-start text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t("aboutUs.backToHome")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-orange-950/20"></div>
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="px-6 py-2">
              <Heart className="w-4 h-4 mr-2 inline fill-current" />
              {t("aboutUs.heroBadge")}
            </Badge>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
              {t("aboutUs.heroTitlePrefix")}{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent">
                Stylora
              </span>
            </h1>
            <div className="text-lg text-muted-foreground max-w-3xl mx-auto space-y-6 text-left">
              <p className="leading-relaxed">{t("aboutUs.heroParagraph1")}</p>
              <p className="leading-relaxed">
                {t("aboutUs.heroParagraph2Prefix")} <strong>stil</strong>{" "}
                {t("aboutUs.heroParagraph2And")}{" "}
                <strong>harmoni</strong>. {t("aboutUs.heroParagraph2Suffix")}
              </p>
              <p className="leading-relaxed">{t("aboutUs.heroParagraph3")}</p>
              <p className="leading-relaxed">{t("aboutUs.heroParagraph4")}</p>
              <p className="leading-relaxed font-semibold text-foreground">
                {t("aboutUs.heroParagraph5")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20 md:py-32">
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Vision */}
            <Card className="border-2 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  {t("aboutUs.visionTitle")}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("aboutUs.visionText")}
                </p>
              </CardContent>
            </Card>

            {/* Mission */}
            <Card className="border-2 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  {t("aboutUs.missionTitle")}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("aboutUs.missionText")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 md:py-32 bg-accent/30">
        <div className="container max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              {t("aboutUs.valuesBadge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("aboutUs.valuesTitlePrefix")}{" "}
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                {t("aboutUs.valuesTitleHighlight")}
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("aboutUs.valuesSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <Card
                key={index}
                className="border-2 hover:shadow-xl transition-all duration-300 group"
              >
                <CardContent className="pt-8 pb-8">
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <value.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline/Milestones */}
      <section className="py-20 md:py-32">
        <div className="container max-w-4xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              {t("aboutUs.journeyBadge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("aboutUs.journeyTitlePrefix")}{" "}
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                {t("aboutUs.journeyTitleHighlight")}
              </span>
            </h2>
          </div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-6 group">
                <div className="shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                    {milestone.year}
                  </div>
                </div>
                <Card className="flex-1 border-2 hover:shadow-xl transition-all duration-300">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-lg">{milestone.event}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-32 bg-accent/30">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              {t("aboutUs.whyBadge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("aboutUs.whyTitlePrefix")}{" "}
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                {t("aboutUs.whyTitleHighlight")}
              </span>
            </h2>
          </div>

          <div className="space-y-6">
            <Card className="border-2">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      {t("aboutUs.whyLanguageTitle")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("aboutUs.whyLanguageText")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      {t("aboutUs.whyGdprTitle")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("aboutUs.whyGdprText")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      {t("aboutUs.whySupportTitle")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("aboutUs.whySupportText")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      {t("aboutUs.whyNoLockInTitle")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("aboutUs.whyNoLockInText")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold">
              {t("aboutUs.ctaTitle")}
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              {t("aboutUs.ctaSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8 py-6 h-auto"
                >
                  {t("aboutUs.ctaTryFree")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 h-auto bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  {t("aboutUs.ctaContact")}
                </Button>
              </Link>
            </div>
            <p className="text-sm opacity-75">
              {t("aboutUs.ctaFootnote")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
