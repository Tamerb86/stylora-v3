// @ts-nocheck
import React, { useEffect } from "react";
import Footer from "@/components/Footer";
import { useAuth, getLoginUrl } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  CreditCard,
  Globe,
  MessageSquare,
  FileText,
  Calculator,
  ShoppingCart,
  Users,
  Scissors,
  UserCog,
  Package,
  BarChart3,
  Check,
  CheckCircle2,
  ArrowRight,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Star,
  Sparkles,
  Heart,
  Award,
  Settings,
  Menu,
  X,
  ChevronRight,
  Play,
  Rocket,
  Target,
  Smile,
} from "lucide-react";
import { isTenantSubdomain } from "@/utils/tenantDetection";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isOwner = user?.openId === import.meta.env.VITE_OWNER_OPEN_ID;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [, setLocation] = useLocation();

  // Redirect tenant subdomains to /book page
  useEffect(() => {
    if (isTenantSubdomain()) {
      console.log("[Home] Tenant subdomain detected - redirecting to /book");
      // Preserve query parameters in redirect
      const search = window.location.search;
      setLocation(`/book${search}`);
    }
  }, [setLocation]);

  const features = [
    {
      icon: Calendar,
      title: t("home.features.calendar.title"),
      description: t("home.features.calendar.description"),
      color: "from-blue-500 to-cyan-500",
      benefits: [
        t("home.features.calendar.benefit1"),
        t("home.features.calendar.benefit2"),
        t("home.features.calendar.benefit3"),
      ],
      image: "/images/real-photos/dashboard-calendar.webp",
    },
    {
      icon: Globe,
      title: t("home.features.onlineBooking.title"),
      description: t("home.features.onlineBooking.description"),
      color: "from-purple-500 to-pink-500",
      benefits: [
        t("home.features.onlineBooking.benefit1"),
        t("home.features.onlineBooking.benefit2"),
        t("home.features.onlineBooking.benefit3"),
      ],
      image: "/images/real-photos/salon-modern-minimalist.webp",
    },
    {
      icon: MessageSquare,
      title: t("home.features.reminders.title"),
      description: t("home.features.reminders.description"),
      color: "from-orange-500 to-red-500",
      benefits: [
        t("home.features.reminders.benefit1"),
        t("home.features.reminders.benefit2"),
        t("home.features.reminders.benefit3"),
      ],
      image: "/images/real-photos/salon-white-clean.webp",
    },
    {
      icon: CreditCard,
      title: t("home.features.payment.title"),
      description: t("home.features.payment.description"),
      color: "from-green-500 to-emerald-500",
      benefits: [
        t("home.features.payment.benefit1"),
        t("home.features.payment.benefit2"),
        t("home.features.payment.benefit3"),
      ],
      image: "/images/real-photos/dashboard-modern.webp",
    },
    {
      icon: Users,
      title: t("home.features.customers.title"),
      description: t("home.features.customers.description"),
      color: "from-indigo-500 to-blue-500",
      benefits: [
        t("home.features.customers.benefit1"),
        t("home.features.customers.benefit2"),
        t("home.features.customers.benefit3"),
      ],
      image: "/images/real-photos/salon-active-customers.webp",
    },
    {
      icon: BarChart3,
      title: t("home.features.analytics.title"),
      description: t("home.features.analytics.description"),
      color: "from-pink-500 to-rose-500",
      benefits: [
        t("home.features.analytics.benefit1"),
        t("home.features.analytics.benefit2"),
        t("home.features.analytics.benefit3"),
      ],
      image: "/images/real-photos/dashboard-analytics.webp",
    },
  ];

  const stats = [
    {
      number: "5000+",
      label: t("home.stats.salons"),
      icon: Heart,
      color: "from-red-500 to-pink-500",
    },
    {
      number: "98%",
      label: t("home.stats.satisfaction"),
      icon: Star,
      color: "from-yellow-500 to-orange-500",
    },
    {
      number: "24/7",
      label: t("home.stats.onlineBooking"),
      icon: Clock,
      color: "from-blue-500 to-cyan-500",
    },
    {
      number: "80%",
      label: t("home.stats.fewerNoShows"),
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
    },
  ];

  const salonImages = [
    "/images/real-photos/salon-luxury-interior.webp",
    "/images/real-photos/salon-modern-minimalist.webp",
    "/images/real-photos/salon-active-customers.webp",
  ];

  const testimonials = [
    {
      name: "Maria Johnsen",
      role: t("home.testimonials.maria.role"),
      content: t("home.testimonials.maria.content"),
      rating: 5,
      avatar: "MJ",
      color: "from-purple-500 to-pink-500",
    },
    {
      name: "Hassan Al-Rashid",
      role: t("home.testimonials.hassan.role"),
      content: t("home.testimonials.hassan.content"),
      rating: 5,
      avatar: "HA",
      color: "from-blue-500 to-cyan-500",
    },
    {
      name: "Linda Svendsen",
      role: t("home.testimonials.linda.role"),
      content: t("home.testimonials.linda.content"),
      rating: 5,
      avatar: "LS",
      color: "from-orange-500 to-red-500",
    },
  ];

  const plans = [
    {
      name: "Start",
      price: "299",
      description: t("home.plans.start.description"),
      features: [
        t("home.plans.start.feature1"),
        t("home.plans.start.feature2"),
        t("home.plans.start.feature3"),
        t("home.plans.start.feature4"),
        t("home.plans.start.feature5"),
        t("home.plans.start.feature6"),
      ],
      highlighted: false,
      icon: Rocket,
      color: "from-blue-500 to-cyan-500",
    },
    {
      name: "Pro",
      price: "799",
      description: t("home.plans.pro.description"),
      features: [
        t("home.plans.pro.feature1"),
        t("home.plans.pro.feature2"),
        t("home.plans.pro.feature3"),
        t("home.plans.pro.feature4"),
        t("home.plans.pro.feature5"),
        t("home.plans.pro.feature6"),
        t("home.plans.pro.feature7"),
      ],
      highlighted: true,
      icon: Target,
      color: "from-purple-500 to-pink-500",
      badge: t("home.plans.pro.badge"),
    },
    {
      name: "Premium",
      price: "1499",
      description: t("home.plans.premium.description"),
      features: [
        t("home.plans.premium.feature1"),
        t("home.plans.premium.feature2"),
        t("home.plans.premium.feature3"),
        t("home.plans.premium.feature4"),
        t("home.plans.premium.feature5"),
        t("home.plans.premium.feature6"),
        t("home.plans.premium.feature7"),
      ],
      highlighted: false,
      icon: Award,
      color: "from-orange-500 to-red-500",
    },
  ];

  const faqs = [
    {
      question: t("home.faqs.technical.question"),
      answer: t("home.faqs.technical.answer"),
    },
    {
      question: t("home.faqs.accountant.question"),
      answer: t("home.faqs.accountant.answer"),
    },
    {
      question: t("home.faqs.vipps.question"),
      answer: t("home.faqs.vipps.answer"),
    },
    {
      question: t("home.faqs.gdpr.question"),
      answer: t("home.faqs.gdpr.answer"),
    },
    {
      question: t("home.faqs.logins.question"),
      answer: t("home.faqs.logins.answer"),
    },
    {
      question: t("home.faqs.trial.question"),
      answer: t("home.faqs.trial.answer"),
    },
  ];

  const trustBadges = [
    { icon: Shield, text: t("home.trustBadges.gdpr"), color: "text-green-600" },
    { icon: Globe, text: t("home.trustBadges.euServers"), color: "text-blue-600" },
    { icon: Zap, text: t("home.trustBadges.noLockIn"), color: "text-purple-600" },
    { icon: CheckCircle2, text: t("home.trustBadges.ssl"), color: "text-orange-600" },
  ];

  // Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://stylora.no/#organization",
        name: "Stylora",
        url: "https://stylora.no",
        logo: {
          "@type": "ImageObject",
          url: "https://stylora.no/stylora-logo.webp",
        },
        description:
          "Komplett bookingsystem for norske frisørsalonger, barbershops og skjønnhetssalonger",
        address: {
          "@type": "PostalAddress",
          addressCountry: "NO",
        },
        sameAs: [
          "https://www.facebook.com/stylora",
          "https://www.instagram.com/stylora",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://stylora.no/#software",
        name: "Stylora",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "NOK",
          lowPrice: "299",
          highPrice: "1299",
          priceSpecification: [
            {
              "@type": "UnitPriceSpecification",
              price: "299",
              priceCurrency: "NOK",
              name: "Start",
              billingDuration: "P1M",
            },
            {
              "@type": "UnitPriceSpecification",
              price: "699",
              priceCurrency: "NOK",
              name: "Pro",
              billingDuration: "P1M",
            },
            {
              "@type": "UnitPriceSpecification",
              price: "1299",
              priceCurrency: "NOK",
              name: "Enterprise",
              billingDuration: "P1M",
            },
          ],
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          ratingCount: "127",
          bestRating: "5",
        },
      },
      {
        "@type": "LocalBusiness",
        "@id": "https://stylora.no/#localbusiness",
        name: "Stylora",
        image: "https://stylora.no/stylora-logo.webp",
        url: "https://stylora.no",
        telephone: "+47-XXX-XXXXX",
        priceRange: "299-1299 NOK/måned",
        address: {
          "@type": "PostalAddress",
          addressCountry: "NO",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 59.9139,
          longitude: 10.7522,
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "09:00",
          closes: "17:00",
        },
        sameAs: [
          "https://www.facebook.com/stylora",
          "https://www.instagram.com/stylora",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://stylora.no/#website",
        url: "https://stylora.no",
        name: "Stylora",
        publisher: {
          "@id": "https://stylora.no/#organization",
        },
        inLanguage: "nb-NO",
      },
    ],
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Enhanced Navigation */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/">
                <a className="flex items-center gap-2 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Scissors className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                    Stylora
                  </span>
                </a>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8">
                <a
                  href="#funksjoner"
                  className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
                >
                  {t("home.nav.features")}
                </a>
                <a
                  href="#priser"
                  className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
                >
                  {t("home.nav.pricing")}
                </a>
                <a
                  href="#faq"
                  className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
                >
                  {t("home.nav.faq")}
                </a>
                <Link href="/about">
                  <a className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                    {t("home.nav.about")}
                  </a>
                </Link>
                <Link href="/gallery">
                  <a className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                    {t("home.nav.gallery")}
                  </a>
                </Link>
                <Link href="/case-study">
                  <a className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                    {t("home.nav.caseStudies")}
                  </a>
                </Link>
                {isOwner && (
                  <Link href="/saas-admin">
                    <a className="text-gray-700 hover:text-purple-600 transition-colors font-medium flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      SaaS Admin
                    </a>
                  </Link>
                )}
                {user ? (
                  <Link href="/dashboard">
                    <a className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300">
                      {t("home.nav.dashboard")}
                    </a>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <a className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                        {t("home.nav.login")}
                      </a>
                    </Link>
                    <Link href="/onboard">
                      <a className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2">
                        {t("home.nav.tryFree")}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden mt-4 pb-4 space-y-3 animate-in slide-in-from-top duration-300">
                <a
                  href="#funksjoner"
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium"
                >
                  {t("home.nav.features")}
                </a>
                <a
                  href="#priser"
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium"
                >
                  {t("home.nav.pricing")}
                </a>
                <a
                  href="#faq"
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium"
                >
                  {t("home.nav.faq")}
                </a>
                <Link href="/about">
                  <a className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium">
                    {t("home.nav.about")}
                  </a>
                </Link>
                <Link href="/gallery">
                  <a className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium">
                    {t("home.nav.gallery")}
                  </a>
                </Link>
                <Link href="/case-study">
                  <a className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium">
                    {t("home.nav.caseStudies")}
                  </a>
                </Link>
                {isOwner && (
                  <Link href="/saas-admin">
                    <a className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      SaaS Admin
                    </a>
                  </Link>
                )}
                {user ? (
                  <Link href="/dashboard">
                    <a className="block px-4 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-lg font-semibold text-center">
                      {t("home.nav.dashboard")}
                    </a>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <a className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium">
                        {t("home.nav.login")}
                      </a>
                    </Link>
                    <Link href="/onboard">
                      <a className="block px-4 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-lg font-semibold text-center">
                        {t("home.nav.tryFree")}
                      </a>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Enhanced Hero Section */}
        <section className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-orange-50">
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative container mx-auto px-4 py-20 md:py-32">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-purple-200 shadow-sm animate-in fade-in slide-in-from-top duration-700">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">
                  {t("home.hero.badge")}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl md:text-7xl font-bold leading-tight animate-in fade-in slide-in-from-bottom duration-700 delay-100">
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                  {t("home.hero.headlineTop")}
                </span>
                <br />
                <span className="text-gray-900">
                  {t("home.hero.headlineBottom")}
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-200">
                {t("home.hero.subheadline")}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
                <Link href="/onboard">
                  <a className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                    {t("home.hero.ctaPrimary")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Link>
                <Link href="/demo">
                  <a className="group px-8 py-4 bg-white text-gray-900 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 border-2 border-gray-200">
                    <Play className="w-5 h-5" />
                    {t("home.hero.ctaDemo")}
                  </a>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-8 animate-in fade-in slide-in-from-bottom duration-700 delay-400">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{t("home.hero.noLockIn")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    {t("home.hero.noCreditCard")}
                  </span>
                </div>
              </div>

              {/* Video Demo Section */}
              <div className="mt-12 animate-in fade-in slide-in-from-bottom duration-700 delay-500">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50 backdrop-blur-sm">
                  {/* Video Placeholder with Play Button */}
                  <div className="relative group cursor-pointer">
                    <img
                      src="/images/real-photos/salon-vintage-barber.webp"
                      alt="Stylora system demo preview"
                      className="w-full h-auto object-cover"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-600 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                        <button
                          onClick={() =>
                            window.open(
                              "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                              "_blank"
                            )
                          }
                          className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300"
                        >
                          <Play
                            className="w-8 h-8 text-purple-600 ml-1"
                            fill="currentColor"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Video Duration Badge */}
                    <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-white text-sm font-semibold">
                      <Clock className="w-4 h-4 inline mr-1" />
                      2:30
                    </div>

                    {/* Video Title */}
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="text-lg font-bold drop-shadow-lg">
                        {t("home.video.title")}
                      </p>
                      <p className="text-sm opacity-90">
                        {t("home.video.subtitle")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              className="w-full h-16 md:h-24 fill-white"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
            >
              <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
            </svg>
          </div>
        </section>

        {/* Enhanced Stats Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="text-center group animate-in fade-in slide-in-from-bottom duration-700"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent mb-2">
                      {stat.number}
                    </div>
                    <div className="text-gray-600 font-medium">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust Badges Bar */}
        <section className="py-8 bg-gradient-to-r from-purple-50 to-orange-50 border-y border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-8">
              {trustBadges.map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-700"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Icon className={`w-5 h-5 ${badge.color}`} />
                    <span className="text-sm font-semibold text-gray-700">
                      {badge.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Enhanced Features Section */}
        <section id="funksjoner" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 px-4 py-1.5 text-sm font-semibold">
                {t("home.featuresSection.badge")}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                {t("home.featuresSection.title")}
              </h2>
              <p className="text-xl text-gray-600">
                {t("home.featuresSection.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-200 animate-in fade-in slide-in-from-bottom duration-700 overflow-hidden"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Feature Image */}
                    {feature.image && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div
                          className={`absolute top-4 left-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-base text-gray-600">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mt-12">
              <a
                href="#priser"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                {t("home.featuresSection.cta")}
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>

        {/* Enhanced Testimonials Section */}
        <section className="py-20 bg-gradient-to-br from-purple-50 via-white to-orange-50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 px-4 py-1.5 text-sm font-semibold">
                {t("home.testimonialsSection.badge")}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                {t("home.testimonialsSection.title")}
              </h2>
              <p className="text-xl text-gray-600">
                {t("home.testimonialsSection.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-200 animate-in fade-in slide-in-from-bottom duration-700 overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Salon Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={salonImages[index]}
                      alt={`${testimonial.name} salon`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-14 h-14 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                      >
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">
                          {testimonial.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed italic">
                      "{testimonial.content}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/case-study">
                <a className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold text-lg group">
                  {t("home.testimonialsSection.readMore")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Link>
            </div>
          </div>
        </section>

        {/* Enhanced Pricing Section */}
        <section id="priser" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1.5 text-sm font-semibold">
                {t("home.pricingSection.badge")}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                {t("home.pricingSection.title")}
              </h2>
              <p className="text-xl text-gray-600">
                {t("home.pricingSection.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => {
                const Icon = plan.icon;
                return (
                  <Card
                    key={index}
                    className={`relative group transition-all duration-300 ${
                      plan.highlighted
                        ? "border-4 border-purple-500 shadow-2xl scale-105 md:scale-110"
                        : "border-2 hover:border-purple-200 hover:shadow-xl"
                    } animate-in fade-in slide-in-from-bottom duration-700`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {plan.badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
                        {plan.badge}
                      </div>
                    )}
                    <CardHeader className="text-center pb-8">
                      <div
                        className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} mb-4 mx-auto shadow-lg`}
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                        {plan.name}
                      </CardTitle>
                      <div className="flex items-baseline justify-center gap-2 mb-2">
                        <span className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                          {plan.price}
                        </span>
                        <span className="text-gray-600 font-medium">
                          {t("home.pricingSection.perMonth")}
                        </span>
                      </div>
                      <CardDescription className="text-base text-gray-600">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-gray-700"
                          >
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link href="/onboard">
                        <a
                          className={`block w-full py-3 rounded-xl font-bold text-center transition-all duration-300 ${
                            plan.highlighted
                              ? "bg-gradient-to-r from-purple-600 to-orange-500 text-white hover:shadow-xl hover:scale-105"
                              : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                          }`}
                        >
                          {t("home.pricingSection.startTrial")}
                        </a>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mt-12 space-y-4">
              <p className="text-gray-600">
                {t("home.pricingSection.trialNote")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>{t("home.pricingSection.noLockIn")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>{t("home.pricingSection.cancelAnytime")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>{t("home.pricingSection.norwegianSupport")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          id="faq"
          className="py-20 bg-gradient-to-br from-gray-50 to-white"
        >
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-4 py-1.5 text-sm font-semibold">
                {t("home.faqSection.badge")}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                {t("home.faqSection.title")}
              </h2>
              <p className="text-xl text-gray-600">
                {t("home.faqSection.subtitle")}
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="bg-white border-2 rounded-xl px-6 hover:border-purple-200 transition-colors animate-in fade-in slide-in-from-bottom duration-700"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-purple-600 text-lg py-6">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 leading-relaxed pb-6">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Enhanced Final CTA Section */}
        <section className="relative py-24 overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          </div>

          <div className="relative container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  {t("home.finalCta.badge")}
                </span>
              </div>

              <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                {t("home.finalCta.title")}
              </h2>

              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
                {t("home.finalCta.subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/onboard">
                  <a className="group px-10 py-5 bg-white text-purple-600 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                    {t("home.finalCta.ctaPrimary")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Link>
                <Link href="/contact">
                  <a className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300 border-2 border-white/30">
                    {t("home.finalCta.contact")}
                  </a>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-white/90">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">
                    {t("home.finalCta.trial")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">{t("home.finalCta.noLockIn")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">{t("home.finalCta.norwegianSupport")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
}
