import React from 'react'
import { useTranslation } from 'react-i18next'
import { sanitizeOutput } from '@/utils/dictionarySecurity'
import { DictionaryReferencesProps } from '@/types/dictionary'
import SafeExternalLink from './SafeExternalLink'

/**
 * Display dictionary term references with secure external links
 * Handles empty data gracefully with user-friendly messages
 */
const DictionaryReferences: React.FC<DictionaryReferencesProps> = ({
  references,
  term,
}) => {
  const { t } = useTranslation(['toolbox'])

  // Check if we have any references at all
  const hasAnyReferences =
    references &&
    (references.wikipedia?.url ||
      references.media?.youtube?.educational_videos?.length ||
      references.media?.youtube?.performances?.length ||
      references.media?.spotify?.artist_url ||
      references.media?.spotify?.track_urls?.length ||
      references.media?.spotify?.playlist_url ||
      references.books?.length ||
      references.research_papers?.length ||
      references.shopping?.instruments?.length ||
      references.shopping?.sheet_music?.length ||
      references.shopping?.accessories?.length)

  if (!hasAnyReferences) {
    return (
      <div className="text-stone-500 italic text-center py-8">
        <p className="mb-2">{t('toolbox:dictionary.noReferencesYet')}</p>
        <p className="text-sm">
          {t('toolbox:dictionary.referencesComingSoon', {
            term: sanitizeOutput(term),
          })}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wikipedia */}
      {references?.wikipedia?.url && (
        <div>
          <h3 className="font-semibold text-stone-700 mb-2 flex items-center">
            <span className="mr-2">📚</span>
            {t('toolbox:dictionary.wikipedia')}
          </h3>
          <SafeExternalLink url={references.wikipedia.url}>
            {t('toolbox:dictionary.readOnWikipedia', {
              term: sanitizeOutput(term),
            })}
          </SafeExternalLink>
          {references.wikipedia.extract && (
            <p className="text-sm text-stone-600 mt-2">
              {sanitizeOutput(references.wikipedia.extract)}
            </p>
          )}
        </div>
      )}

      {/* YouTube Educational Videos */}
      {references?.media?.youtube?.educational_videos &&
        references.media.youtube.educational_videos.length > 0 && (
          <div>
            <h3 className="font-semibold text-stone-700 mb-2 flex items-center">
              <span className="mr-2">📺</span>
              {t('toolbox:dictionary.educationalVideos')}
            </h3>
            <div className="space-y-2">
              {references.media.youtube.educational_videos.map(
                (video, index) => (
                  <div key={index}>
                    <SafeExternalLink url={video.url}>
                      {sanitizeOutput(video.title)}
                    </SafeExternalLink>
                    {video.channel && (
                      <span className="text-sm text-stone-600 ml-2">
                        {t('toolbox:dictionary.byChannel', {
                          channel: sanitizeOutput(video.channel),
                        })}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* YouTube Performances */}
      {references?.media?.youtube?.performances &&
        references.media.youtube.performances.length > 0 && (
          <div>
            <h3 className="font-semibold text-stone-700 mb-2 flex items-center">
              <span className="mr-2">🎭</span>
              {t('toolbox:dictionary.performances')}
            </h3>
            <div className="space-y-2">
              {references.media.youtube.performances.map((video, index) => (
                <div key={index}>
                  <SafeExternalLink url={video.url}>
                    {sanitizeOutput(video.title)}
                  </SafeExternalLink>
                  {video.channel && (
                    <span className="text-sm text-stone-600 ml-2">
                      {t('toolbox:dictionary.byChannel', {
                        channel: sanitizeOutput(video.channel),
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Spotify */}
      {references?.media?.spotify &&
        (references.media.spotify.artist_url ||
          references.media.spotify.track_urls?.length ||
          references.media.spotify.playlist_url) && (
          <div>
            <h3 className="font-semibold text-stone-700 mb-2 flex items-center">
              <span className="mr-2">🎵</span>
              {t('toolbox:dictionary.spotify')}
            </h3>
            <div className="space-y-2">
              {references.media.spotify.artist_url && (
                <div>
                  <SafeExternalLink url={references.media.spotify.artist_url}>
                    {t('toolbox:dictionary.listenToArtist', {
                      name: sanitizeOutput(term),
                    })}
                  </SafeExternalLink>
                </div>
              )}
              {references.media.spotify.track_urls?.map((url, index) => (
                <div key={index}>
                  <SafeExternalLink url={url}>
                    {t('toolbox:dictionary.listenToTrack', {
                      name: `${t('toolbox:dictionary.track')} ${index + 1}`,
                    })}
                  </SafeExternalLink>
                </div>
              ))}
              {references.media.spotify.playlist_url && (
                <div>
                  <SafeExternalLink url={references.media.spotify.playlist_url}>
                    {t('toolbox:dictionary.listenToPlaylist', {
                      name: sanitizeOutput(term),
                    })}
                  </SafeExternalLink>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Books */}
      {references?.books && references.books.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-700 mb-2 flex items-center">
            <span className="mr-2">📖</span>
            {t('toolbox:dictionary.books')}
          </h3>
          <div className="space-y-2">
            {references.books.map((book, index) => (
              <div key={index}>
                <SafeExternalLink
                  url={book.amazon_url || book.affiliate_url || '#'}
                >
                  {sanitizeOutput(book.title)}
                </SafeExternalLink>
                <span className="text-sm text-stone-600 ml-2">
                  {t('toolbox:dictionary.byAuthor', {
                    author: sanitizeOutput(book.author),
                  })}
                </span>
                {book.isbn && (
                  <span className="text-xs text-stone-500 ml-2">
                    ISBN: {book.isbn}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research Papers */}
      {references?.research_papers && references.research_papers.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-700 mb-2 flex items-center">
            <span className="mr-2">🔬</span>
            {t('toolbox:dictionary.researchPapers')}
          </h3>
          <div className="space-y-2">
            {references.research_papers.map((paper, index) => (
              <div key={index}>
                <SafeExternalLink
                  url={paper.url || `https://doi.org/${paper.doi}` || '#'}
                >
                  {sanitizeOutput(paper.title)}
                </SafeExternalLink>
                <div className="text-sm text-stone-600">
                  {paper.authors
                    .map(author => sanitizeOutput(author))
                    .join(', ')}
                  {paper.published_date && (
                    <span className="ml-2">({paper.published_date})</span>
                  )}
                </div>
                {paper.abstract_excerpt && (
                  <p className="text-xs text-stone-500 mt-1">
                    {sanitizeOutput(paper.abstract_excerpt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shopping - Instruments */}
      {references?.shopping?.instruments &&
        references.shopping.instruments.length > 0 && (
          <div>
            <h3 className="font-semibold text-stone-700 mb-2 flex items-center">
              <span className="mr-2">🎸</span>
              {t('toolbox:dictionary.instruments')}
            </h3>
            <div className="space-y-2">
              {references.shopping.instruments.map((item, index) => (
                <div key={index}>
                  <SafeExternalLink
                    url={item.affiliate_url || item.product_url}
                  >
                    {sanitizeOutput(item.store_name)}
                  </SafeExternalLink>
                  {item.price_range && (
                    <span className="text-sm text-stone-600 ml-2">
                      {item.price_range}
                    </span>
                  )}
                  {item.rating && (
                    <span className="text-sm text-stone-600 ml-2">
                      ⭐ {item.rating}/5
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Shopping - Sheet Music */}
      {references?.shopping?.sheet_music &&
        references.shopping.sheet_music.length > 0 && (
          <div>
            <h3 className="font-semibold text-stone-700 mb-2 flex items-center">
              <span className="mr-2">🎼</span>
              {t('toolbox:dictionary.sheetMusic')}
            </h3>
            <div className="space-y-2">
              {references.shopping.sheet_music.map((item, index) => (
                <div key={index}>
                  <SafeExternalLink
                    url={item.affiliate_url || item.product_url}
                  >
                    {sanitizeOutput(item.store_name)}
                  </SafeExternalLink>
                  {item.price && (
                    <span className="text-sm text-stone-600 ml-2">
                      {item.price}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Note about external links */}
      <div className="mt-6 pt-6 border-t border-stone-200">
        <p className="text-xs text-stone-500 italic">
          {t('toolbox:dictionary.externalLinkNote')}
        </p>
      </div>
    </div>
  )
}

export default DictionaryReferences
