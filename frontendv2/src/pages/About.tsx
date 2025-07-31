import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Github,
  Lock,
  BookOpen,
  Mail,
  Home,
  Info,
  Package,
  Users,
  MessageCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Tabs } from '../components/ui'
import VersionInfo from '../components/VersionInfo'

export default function About() {
  const { t } = useTranslation(['about', 'common'])
  const [activeTab, setActiveTab] = useState('about')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <AppLayout>
      <div className="p-4 sm:p-8">
        {/* Tabs */}
        <Tabs
          tabs={[
            {
              id: 'about',
              label: t('about:tabs.about', 'About'),
              icon: <Info size={20} />,
            },
            {
              id: 'version',
              label: t('about:tabs.version', 'Version'),
              icon: <Package size={20} />,
            },
            {
              id: 'credits',
              label: t('about:tabs.credits', 'Credits'),
              icon: <Users size={20} />,
            },
            {
              id: 'contact',
              label: t('about:tabs.contact', 'Contact'),
              icon: <MessageCircle size={20} />,
            },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-6"
        />

        {/* Tab Content */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="font-lexend text-4xl sm:text-5xl font-light text-morandi-stone-700 mb-4 tracking-wide">
                {t('common:appName')}
              </h1>
              <p className="font-inter text-lg text-morandi-stone-600">
                {t('about:tagline')}
              </p>
            </div>

            {/* About Mirubato Card */}
            <Card className="border-l-4 border-morandi-sage-400">
              <CardHeader>
                <CardTitle className="font-lexend text-morandi-stone-700">
                  {t('about:sections.about.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-inter text-morandi-stone-600">
                <p>{t('about:sections.about.what')}</p>
                <p>{t('about:sections.about.why')}</p>
                <p>{t('about:sections.about.how')}</p>
              </CardContent>
            </Card>

            {/* Open Source Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
                  <Github className="h-5 w-5" />
                  {t('about:sections.openSource.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-inter text-morandi-stone-600">
                <p>{t('about:sections.openSource.description')}</p>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-morandi-sage-100 text-morandi-sage-700">
                    MIT License
                  </span>
                  <a
                    href="https://github.com/pezware/mirubato"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm px-3 py-1.5 rounded-md text-morandi-sage-600 hover:text-morandi-sage-700 hover:bg-morandi-stone-100 transition-all duration-200"
                  >
                    {t('about:sections.openSource.viewOnGithub')}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Privacy First Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
                  <Lock className="h-5 w-5" />
                  {t('about:sections.privacy.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 font-inter text-morandi-stone-600">
                  <li className="flex items-start">
                    <span className="text-morandi-sage-600 mr-2">•</span>
                    {t('about:sections.privacy.dataOwnership')}
                  </li>
                  <li className="flex items-start">
                    <span className="text-morandi-sage-600 mr-2">•</span>
                    {t('about:sections.privacy.localFirst')}
                  </li>
                  <li className="flex items-start">
                    <span className="text-morandi-sage-600 mr-2">•</span>
                    {t('about:sections.privacy.noTracking')}
                  </li>
                  <li className="flex items-start">
                    <span className="text-morandi-sage-600 mr-2">•</span>
                    {t('about:sections.privacy.optionalSync')}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Version Tab */}
        {activeTab === 'version' && <VersionInfo />}

        {/* Credits Tab */}
        {activeTab === 'credits' && (
          <div className="space-y-6">
            {/* Educational Content Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
                  <BookOpen className="h-5 w-5" />
                  {t('about:sections.credits.educationalContent')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-inter text-morandi-stone-600">
                <div>
                  <p className="text-sm">
                    {t('about:sections.credits.chelseaGreen')}
                  </p>
                  <a
                    href="https://press.rebus.community/sightreadingforguitar/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-morandi-sage-600 hover:text-morandi-sage-700 underline"
                  >
                    {t('about:sections.credits.viewSource')}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Musical Content Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-lexend text-morandi-stone-700">
                  {t('about:sections.credits.musicalContent')}
                </CardTitle>
              </CardHeader>
              <CardContent className="font-inter text-morandi-stone-600">
                <p className="text-sm">{t('about:sections.credits.imslp')}</p>
              </CardContent>
            </Card>

            {/* Open Source Libraries Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-lexend text-morandi-stone-700">
                  {t('about:sections.credits.openSourceLibraries')}
                </CardTitle>
              </CardHeader>
              <CardContent className="font-inter text-morandi-stone-600">
                <p className="text-sm">
                  {t('about:sections.credits.librariesDescription')}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
                  <Mail className="h-5 w-5" />
                  {t('about:sections.contact.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-inter">
                <div className="flex items-center justify-between py-2">
                  <span className="text-morandi-stone-600">
                    {t('about:sections.contact.github')}
                  </span>
                  <a
                    href="https://github.com/pezware/mirubato/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1.5 rounded-md text-morandi-sage-600 hover:text-morandi-sage-700 hover:bg-morandi-stone-100 transition-all duration-200"
                  >
                    {t('about:sections.contact.reportIssue')}
                  </a>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-morandi-stone-600">
                    {t('about:sections.contact.twitter')}
                  </span>
                  <a
                    href="https://x.com/arbeitandy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1.5 rounded-md text-morandi-sage-600 hover:text-morandi-sage-700 hover:bg-morandi-stone-100 transition-all duration-200"
                  >
                    @arbeitandy
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Back to Home */}
            <div className="text-center pt-8 pb-12">
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-inter text-sm px-4 py-2 rounded-lg border border-morandi-stone-300 text-morandi-stone-600 hover:bg-morandi-stone-100 transition-all duration-200"
              >
                <Home className="h-4 w-4" />
                {t('about:backToHome')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
