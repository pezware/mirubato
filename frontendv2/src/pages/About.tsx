import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Github, Lock, BookOpen, Mail, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import UnifiedHeader from '../components/layout/UnifiedHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'

export default function About() {
  const { t } = useTranslation(['about', 'common'])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-morandi-stone-50">
      <UnifiedHeader currentPage="logbook" showAuth={false} />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-thin text-morandi-stone-700 mb-4 tracking-wide">
            {t('common:appName')}
          </h1>
          <p className="text-lg text-morandi-stone-600">{t('about:tagline')}</p>
        </div>

        {/* Cards Container */}
        <div className="space-y-6">
          {/* About Mirubato Card */}
          <Card className="border-l-4 border-morandi-sage-400">
            <CardHeader>
              <CardTitle className="text-morandi-stone-700">
                {t('about:sections.about.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-morandi-stone-600">
              <p>{t('about:sections.about.what')}</p>
              <p>{t('about:sections.about.why')}</p>
              <p>{t('about:sections.about.how')}</p>
            </CardContent>
          </Card>

          {/* Open Source Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-morandi-stone-700">
                <Github className="h-5 w-5" />
                {t('about:sections.openSource.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-morandi-stone-600">
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
              <CardTitle className="flex items-center gap-2 text-morandi-stone-700">
                <Lock className="h-5 w-5" />
                {t('about:sections.privacy.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-morandi-stone-600">
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

          {/* Credits & Attribution Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-morandi-stone-700">
                <BookOpen className="h-5 w-5" />
                {t('about:sections.credits.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-morandi-stone-600">
              <div>
                <p className="font-medium text-morandi-stone-700 mb-1">
                  {t('about:sections.credits.educationalContent')}
                </p>
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
              <div>
                <p className="font-medium text-morandi-stone-700 mb-1">
                  {t('about:sections.credits.musicalContent')}
                </p>
                <p className="text-sm">{t('about:sections.credits.imslp')}</p>
              </div>
              <div>
                <p className="font-medium text-morandi-stone-700 mb-1">
                  {t('about:sections.credits.openSourceLibraries')}
                </p>
                <p className="text-sm">
                  {t('about:sections.credits.librariesDescription')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-morandi-stone-700">
                <Mail className="h-5 w-5" />
                {t('about:sections.contact.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-morandi-stone-300 text-morandi-stone-600 hover:bg-morandi-stone-100 transition-all duration-200"
            >
              <Home className="h-4 w-4" />
              {t('about:backToHome')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
