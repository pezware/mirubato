import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'

// Lazy load the Scorebook components
const ScorebookPage = lazy(() => import('../pages/Scorebook'))
const ScoreBrowser = lazy(() => import('../pages/ScoreBrowser'))

export const scorebookRoutes: RouteObject[] = [
  {
    path: '/scorebook',
    children: [
      {
        path: '',
        element: <ScoreBrowser />,
      },
      {
        path: 'browse',
        element: <ScoreBrowser />,
      },
      {
        path: ':scoreId',
        element: <ScorebookPage />,
      },
      {
        path: 'collection/:slug',
        element: <ScoreBrowser />,
      },
    ],
  },
]
