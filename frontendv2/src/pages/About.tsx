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
  Settings,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Tabs } from '../components/ui'
import VersionInfo from '../components/VersionInfo'
import { WebSocketSyncDemo } from '../components/debug'
import { DataSubjectRights } from '../components/privacy/DataSubjectRights'

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
            // Add debug tab in development
            ...(process.env.NODE_ENV === 'development'
              ? [
                  {
                    id: 'debug',
                    label: 'Debug',
                    icon: <Settings size={20} />,
                  },
                ]
              : []),
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

            {/* Privacy Policy Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
                  <Lock className="h-5 w-5" />
                  {t('about:sections.privacy.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 font-inter text-morandi-stone-600">
                <div className="bg-morandi-sage-50 p-4 rounded-lg border border-morandi-sage-200">
                  <p className="text-sm text-morandi-stone-700 font-medium mb-2">
                    {t('about:sections.privacy.intro')}
                  </p>
                  <p className="text-xs text-morandi-stone-600">
                    {t('about:sections.privacy.lastUpdated')}
                  </p>
                </div>

                {/* Data Controller */}
                <div className="space-y-3">
                  <h4 className="font-medium text-morandi-stone-700">
                    {t('about:sections.privacy.controller.title')}
                  </h4>
                  <p className="text-sm">
                    {t('about:sections.privacy.controller.info')}
                  </p>
                </div>

                {/* Legal Basis */}
                <div className="space-y-3">
                  <h4 className="font-medium text-morandi-stone-700">
                    {t('about:sections.privacy.legalBasis.title')}
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.legalBasis.consent')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.legalBasis.contract')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.legalBasis.legitimate')}
                    </li>
                  </ul>
                </div>

                {/* Personal Data We Collect */}
                <div className="space-y-3">
                  <h4 className="font-medium text-morandi-stone-700">
                    {t('about:sections.privacy.dataWeCollect.title')}
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeCollect.account')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeCollect.profile')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeCollect.practice')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeCollect.technical')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeCollect.usage')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeCollect.device')}
                    </li>
                  </ul>
                </div>

                {/* How We Store and Process Your Data */}
                <div className="space-y-3">
                  <h4 className="font-medium text-morandi-stone-700">
                    {t('about:sections.privacy.dataWeStore.title')}
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeStore.localFirst')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeStore.cloudSync')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeStore.location')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeStore.security')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeStore.retention')}
                    </li>
                  </ul>
                </div>

                {/* Data Sharing and Third Parties */}
                <div className="space-y-3">
                  <h4 className="font-medium text-morandi-stone-700">
                    {t('about:sections.privacy.dataWeShare.title')}
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeShare.noSelling')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeShare.noAds')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeShare.noTracking')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeShare.noThirdParty')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeShare.service')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.dataWeShare.legal')}
                    </li>
                  </ul>
                </div>

                {/* Cookies and Tracking */}
                <div className="space-y-3">
                  <h4 className="font-medium text-morandi-stone-700">
                    {t('about:sections.privacy.cookies.title')}
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.cookies.essential')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.cookies.functional')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.cookies.noTracking')}
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      {t('about:sections.privacy.cookies.control')}
                    </li>
                  </ul>
                </div>

                {/* Your GDPR Rights */}
                <div className="space-y-3">
                  <h4 className="font-medium text-morandi-stone-700">
                    {t('about:sections.privacy.yourRights.title')}
                  </h4>
                  <p className="text-sm italic text-morandi-stone-600 mb-3">
                    {t('about:sections.privacy.yourRights.intro')}
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      <strong className="text-morandi-stone-700">
                        {t('about:sections.privacy.yourRights.access')}
                      </strong>
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      <strong className="text-morandi-stone-700">
                        {t('about:sections.privacy.yourRights.rectification')}
                      </strong>
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      <strong className="text-morandi-stone-700">
                        {t('about:sections.privacy.yourRights.erasure')}
                      </strong>
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      <strong className="text-morandi-stone-700">
                        {t('about:sections.privacy.yourRights.restrict')}
                      </strong>
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      <strong className="text-morandi-stone-700">
                        {t('about:sections.privacy.yourRights.portability')}
                      </strong>
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      <strong className="text-morandi-stone-700">
                        {t('about:sections.privacy.yourRights.object')}
                      </strong>
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      <strong className="text-morandi-stone-700">
                        {t('about:sections.privacy.yourRights.withdraw')}
                      </strong>
                    </li>
                    <li className="flex items-start">
                      <span className="text-morandi-sage-600 mr-2">•</span>
                      <strong className="text-morandi-stone-700">
                        {t('about:sections.privacy.yourRights.complain')}
                      </strong>
                    </li>
                  </ul>
                  <div className="mt-3 p-3 bg-morandi-sage-50 rounded border border-morandi-sage-200">
                    <p className="text-sm font-medium text-morandi-stone-700">
                      {t('about:sections.privacy.yourRights.exercise')}
                    </p>
                  </div>
                </div>

                {/* Additional GDPR Sections */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Data Subject Requests */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-morandi-stone-700">
                      {t('about:sections.privacy.dataSubjectRequests.title')}
                    </h4>
                    <ul className="space-y-1 text-xs">
                      <li>
                        •{' '}
                        {t(
                          'about:sections.privacy.dataSubjectRequests.response'
                        )}
                      </li>
                      <li>
                        •{' '}
                        {t(
                          'about:sections.privacy.dataSubjectRequests.verification'
                        )}
                      </li>
                      <li>
                        •{' '}
                        {t('about:sections.privacy.dataSubjectRequests.format')}
                      </li>
                      <li>
                        • {t('about:sections.privacy.dataSubjectRequests.free')}
                      </li>
                    </ul>
                  </div>

                  {/* International Transfers */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-morandi-stone-700">
                      {t('about:sections.privacy.international.title')}
                    </h4>
                    <ul className="space-y-1 text-xs">
                      <li>
                        • {t('about:sections.privacy.international.cloudflare')}
                      </li>
                      <li>
                        • {t('about:sections.privacy.international.adequacy')}
                      </li>
                    </ul>
                  </div>

                  {/* Automated Decision Making */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-morandi-stone-700">
                      {t('about:sections.privacy.automated.title')}
                    </h4>
                    <p className="text-xs">
                      {t('about:sections.privacy.automated.info')}
                    </p>
                  </div>

                  {/* Children's Privacy */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-morandi-stone-700">
                      {t('about:sections.privacy.children.title')}
                    </h4>
                    <p className="text-xs">
                      {t('about:sections.privacy.children.info')}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-morandi-sage-50 p-4 rounded-lg border border-morandi-sage-200">
                  <h4 className="font-medium text-morandi-stone-700 mb-2">
                    {t('about:sections.privacy.contact.title')}
                  </h4>
                  <p className="text-sm text-morandi-stone-700">
                    {t('about:sections.privacy.contact.email')}
                  </p>
                  <p className="text-xs text-morandi-stone-600 mt-1">
                    {t('about:sections.privacy.contact.response')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Subject Rights */}
            <DataSubjectRights />
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

        {/* Debug Tab (Development only) */}
        {activeTab === 'debug' && process.env.NODE_ENV === 'development' && (
          <div className="space-y-6">
            {/* WebSocket Sync Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
                  <Settings className="h-5 w-5" />
                  WebSocket Sync Testing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WebSocketSyncDemo />
              </CardContent>
            </Card>

            {/* Feature Flags */}
            <Card>
              <CardHeader>
                <CardTitle className="font-lexend text-morandi-stone-700">
                  Feature Flags
                </CardTitle>
              </CardHeader>
              <CardContent className="font-inter">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        localStorage.getItem(
                          'mirubato:features:websocket-sync'
                        ) === 'true'
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          localStorage.setItem(
                            'mirubato:features:websocket-sync',
                            'true'
                          )
                        } else {
                          localStorage.removeItem(
                            'mirubato:features:websocket-sync'
                          )
                        }
                        window.location.reload()
                      }}
                    />
                    <span className="text-sm">
                      Enable WebSocket Sync Feature
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
